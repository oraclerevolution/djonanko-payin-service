import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Payin } from './entities/paiement.entity';
import { Repository } from 'typeorm';
import { AdministrationService } from 'libs/administration/src/service/administration.service';
import { ConfigService } from '@nestjs/config';
import { MakePaiementDto } from './dto/make-paiement.dto';
import { QueryResponse } from './enums/QueryResponse.enum';
import { CreateHistoriqueResultDto } from './entities/create-historique-result.dto';
import { PaymentInitDto } from './dto/paiement-init.dto';
import { PaymentDebitDto } from './dto/paiement-debit.dto';
import { PaymentExecDto } from './dto/paiement-exec.dto';
import { CollectType } from './enums/collect-type.enum';
import { TransactionType } from './enums/paiement-type.enum';
import { MakeAbonnementDto } from './dto/make-abonnement.dto';
import { Cron } from '@nestjs/schedule';
import { PaymentRequestDto } from './enums/paiement-request.dto';
import { ValidatePaymentDto } from './enums/validate-paiement.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class PayinService {
  constructor(
    @InjectRepository(Payin) private readonly repository: Repository<Payin>,
    @InjectQueue('payin-queue') private readonly payinQueue: Queue,
    private readonly administrationService: AdministrationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Calculates the transaction fees for a given amount.
   *
   * @param {number} amount - The amount for which to calculate the transaction fees.
   * @return {number} - The total amount including the transaction fees.
   */
  getTransactionFees(amount: number, mode: boolean): number {
    if (mode === true) {
      return amount;
    } else {
      const fees = 0.01 * amount;
      return amount + fees;
    }
  }

  /**
   * Generates a random reference string.
   *
   * @return {string} The generated reference string.
   */
  generateReference(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let reference = '';
    for (let i = 0; i < 10; i++) {
      reference += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    return `DJONANKO-${reference}`;
  }

  async addPayinJob(payload: MakePaiementDto) {
    await this.payinQueue.add(payload, {
      attempts: 2, //Nombre de tentatives en cas d'échec
      backoff: 5000, //Délai avant de retenter (en millisecondes)
    });
  }

  /**
   * Initializes a payment process by creating a payment object, transaction, and
   * updating the sender's balance. If the receiver's information is not found,
   * returns an object with null values. If the payment is successful, returns an
   * object with the payment, transaction, and receiver information. If the payment
   * fails, returns an object with the payment and error information.
   *
   * @param {MakePaiementDto} payload - The data needed to make the payment.
   * @return {Promise<PaymentInitDto>} - An object with the payment, transaction,
   * receiver information, and status.
   */
  async paiementInitializer(payload: MakePaiementDto): Promise<PaymentInitDto> {
    const { senderPhoneNumber, receiverPhoneNumber, amount } = payload;
    const getSenderInfos = await this.administrationService.getUserData(
      process.env.API_KEY_PAYIN,
      senderPhoneNumber,
    );

    const getReceiverInfos = await this.administrationService.getUserData(
      process.env.API_KEY_PAYIN,
      receiverPhoneNumber,
    );

    const balanceAfterSending =
      parseInt(getSenderInfos.solde) -
      this.getTransactionFees(parseInt(amount), getSenderInfos.premium);

    if (getReceiverInfos === undefined) {
      return {
        payment: null,
        amount: amount,
        historique: null,
        transaction: null,
        fees: null,
        senderInfos: null,
        status: QueryResponse.NOT_FOUND,
        receiverNumber: receiverPhoneNumber,
      };
    } else {
      //on initialise le paiement avec un statut PENDING
      const payment = new Payin();
      payment.amount = amount;
      if (getSenderInfos.premium === true) {
        payment.fees = (0.005 * parseInt(amount)).toString();
      } else {
        payment.fees = (0.01 * parseInt(amount)).toString();
      }
      payment.amountBeforeSending = getSenderInfos.solde;
      payment.reference = this.generateReference();
      payment.amountAfterSending = balanceAfterSending.toString();
      payment.senderPhoneNumber = senderPhoneNumber;
      payment.receiverPhoneNumber = receiverPhoneNumber;
      await this.repository.save(payment);

      //on cree la transaction
      // const newPayment = await this.createpaiement(payload, getSenderInfos);
      let historique: CreateHistoriqueResultDto = null;
      if (payment) {
        const transaction = await this.administrationService.createTransaction(
          process.env.API_KEY_PAYIN,
          {
            amount: amount,
            amountBeforeSending: payment.amountBeforeSending,
            amountAfterSending: payment.amountAfterSending,
            senderPhoneNumber: payment.senderPhoneNumber,
            reference: payment.reference,
            receiverPhoneNumber: payment.receiverPhoneNumber,
            fees: payment.fees,
            status: 'PENDING',
            type: 'PAIEMENT',
          },
        );
        historique = await this.createHistorique({
          sender: getSenderInfos,
          receiver: getReceiverInfos,
          senderIdentifiant: getSenderInfos.id,
          receiverIdentifiant: getReceiverInfos.id,
          referenceTransaction: payment.reference,
          transactionType: 'PAIEMENT',
          amount: amount,
          fees: payment.fees,
          status: 'PENDING',
          icon: 'send',
        });
        //supprimer les données non utilisable
        delete historique.historique.sender;
        delete historique.historique.receiver;

        return {
          payment: payment,
          amount: amount,
          historique: historique.historique,
          transaction: transaction,
          fees: payment.fees,
          senderInfos: getSenderInfos,
          status: QueryResponse.SUCCESS,
          receiverNumber: receiverPhoneNumber,
        };
      } else {
        await this.repository.update(payment.id, {
          status: 'FAILED',
        });
        return {
          payment: payment,
          amount: amount,
          historique: historique.historique,
          transaction: null,
          fees: payment.fees,
          senderInfos: getSenderInfos,
          status: QueryResponse.ERROR,
          receiverNumber: receiverPhoneNumber,
        };
      }
    }
  }

  /**
+   * Performs a payment debit by updating the sender's balance, creating a compte reservation,
+   * and updating the transaction and historique statuses.
+   *
+   * @param {Payin} paiement - The payment object.
+   * @param {any} transaction - The transaction object.
+   * @param {any} historique - The historique object.
+   * @param {string} amount - The amount of the payment.
+   * @param {any} senderInfos - The sender's information.
+   * @param {string} fees - The fees for the payment.
+   * @param {string} receiverNumber - The receiver's phone number.
+   * @return {Promise<PaymentDebitDto>} - An object containing the payment, transaction,
+   * reservation, amount, receiver number, sender information, fees, and status.
+   */
  async paymentDebit(
    paiement: Payin,
    transaction: any,
    historique: any,
    amount: string,
    senderInfos: any,
    fees: string,
    receiverNumber: string,
  ): Promise<PaymentDebitDto> {
    const cost = parseInt(amount) + parseInt(fees);
    const balanceAfterSending = parseInt(senderInfos.solde) - cost;
    if (balanceAfterSending < 0) {
      await this.repository.update(paiement.id, {
        status: 'FAILED',
      });
      await this.administrationService.updateTransaction(
        process.env.API_KEY_PAYIN,
        transaction.id,
        {
          status: 'FAILED',
        },
      );
      return {
        paiement,
        transaction,
        reservation: null,
        amount,
        receiverNumber,
        senderInfos,
        fees,
        status: QueryResponse.INSUFFICIENT_FUNDS,
      };
    }
    await this.administrationService.updateUser(
      process.env.API_KEY_PAYIN,
      senderInfos.id,
      {
        solde: balanceAfterSending.toString(),
      },
    );

    const reservation =
      await this.administrationService.createCompteReservation(
        process.env.API_KEY_PAYIN,
        {
          amount: amount,
          fees: fees,
          fundsToSend: (parseInt(amount) + parseInt(fees)).toString(),
          transactionStatus: 'IN PROGRESS',
          transactionType: 'PAIEMENT',
        },
      );
    if (reservation) {
      const user = await this.administrationService.getUserData(
        process.env.API_KEY_PAYIN,
        this.configService.get<string>('COMPTE_RESERVATION'),
      );
      const balanceAfterSending =
        parseInt(user.solde) + parseInt(amount) + parseInt(fees);
      const credit = await this.administrationService.updateUser(
        process.env.API_KEY_PAYIN,
        user.id,
        {
          solde: balanceAfterSending.toString(),
        },
      );
      if (credit.affected === 1) {
        return {
          paiement,
          transaction,
          reservation,
          amount,
          receiverNumber,
          senderInfos,
          fees,
          status: QueryResponse.SUCCESS,
        };
      } else {
        await this.repository.update(paiement.id, {
          status: 'FAILED',
        });
        await this.administrationService.updateHistorique(
          process.env.API_KEY_PAYIN,
          historique.id,
          {
            status: 'FAILED',
          },
        );
        await this.administrationService.updateTransaction(
          process.env.API_KEY_PAYIN,
          transaction.id,
          {
            status: 'FAILED',
          },
        );
        return {
          paiement,
          transaction,
          reservation,
          amount,
          receiverNumber,
          senderInfos,
          fees,
          status: QueryResponse.ERROR,
        };
      }
    }
  }

  async sendPayment(
    senderInfos: any,
    reservation: any,
    receiverNumber: string,
    amount: string,
    paiement: Payin,
    transaction: any,
    fees: string,
    historique: any,
    abonnement?: boolean,
  ): Promise<PaymentExecDto> {
    const getReceiverInfos = await this.administrationService.getUserData(
      process.env.API_KEY_PAYIN,
      receiverNumber,
    );
    const updateReceiverBalance = await this.administrationService.updateUser(
      process.env.API_KEY_PAYIN,
      getReceiverInfos.id,
      {
        solde: (parseInt(getReceiverInfos.solde) + parseInt(amount)).toString(),
      },
    );
    if (updateReceiverBalance.affected === 1) {
      //debit reservation account
      const user = await this.administrationService.getUserData(
        process.env.API_KEY_PAYIN,
        this.configService.get<string>('COMPTE_RESERVATION'),
      );
      const balanceAfterSending =
        parseInt(user.solde) - (parseInt(amount) + parseInt(fees));
      const debit = await this.administrationService.updateUser(
        process.env.API_KEY_PAYIN,
        user.id,
        {
          solde: balanceAfterSending.toString(),
        },
      );
      if (debit.affected === 1) {
        const user = await this.administrationService.getUserData(
          process.env.API_KEY_PAYIN,
          this.configService.get<string>('COMPTE_COLLECTE'),
        );
        const balanceAfterSending = parseInt(user.solde) + parseInt(fees);
        const credit = await this.administrationService.updateUser(
          process.env.API_KEY_PAYIN,
          user.id,
          {
            solde: balanceAfterSending.toString(),
          },
        );
        if (credit) {
          await this.administrationService.createCompteCollecte(
            process.env.API_KEY_PAYIN,
            {
              amount: fees,
              collectType: CollectType.FRAIS,
            },
          );
          //update reservation status
          await this.administrationService.updateCompteReservation(
            process.env.API_KEY_PAYIN,
            reservation.id,
            {
              transactionStatus: 'COMPLETED',
            },
          );

          //update payment status
          await this.repository.update(paiement.id, {
            status: TransactionType.SUCCESS,
          });

          //update transaction status
          await this.administrationService.updateTransaction(
            process.env.API_KEY_PAYIN,
            transaction.id,
            {
              status: 'SUCCESS',
            },
          );

          //update historique status
          await this.administrationService.updateHistorique(
            process.env.API_KEY_PAYIN,
            historique.id,
            {
              status: TransactionType.SUCCESS,
            },
          );

          //check is the payment is abonnement
          if (abonnement && abonnement === true) {
            await this.administrationService.updateUser(
              process.env.API_KEY_PAYIN,
              senderInfos.id,
              {
                premium: true,
                premiumActivated: true,
              },
            );
          }

          //check if user is new
          const isNewUser =
            await this.administrationService.userReferralByUserId(
              process.env.API_KEY_PAYIN,
              senderInfos.id,
            );
          if (isNewUser.isNew === true) {
            const host = await this.administrationService.getUserDataById(
              process.env.API_KEY_PAYIN,
              isNewUser.hostId,
            );
            if (host) {
              const currentPoint = host.referralAmountToPoint;
              await this.administrationService.updateUser(
                process.env.API_KEY_PAYIN,
                host.id,
                {
                  referralAmountToPoint: currentPoint + 500,
                },
              );
              await this.administrationService.updateReferral(
                process.env.API_KEY_PAYIN,
                isNewUser.id,
                {
                  isNew: false,
                },
              );
            }
          }

          //notification au sender
          await this.administrationService.sendNotifications(
            process.env.API_KEY_PAYIN,
            {
              token: senderInfos.expoPushToken,
              title: 'Paiement Djonanko',
              body: `Votre paiement de ${amount} FCFA a été effectue avec succes.`,
            },
          );
          //notification au receiver
          await this.administrationService.sendNotifications(
            process.env.API_KEY_PAYIN,
            {
              token: getReceiverInfos.expoPushToken,
              title: 'Paiement Djonanko',
              body: `${getReceiverInfos.fullname} a effectué un paiement de ${amount} FCFA`,
            },
          );
        } else {
          return {
            status: QueryResponse.ERROR,
          };
        }

        return {
          status: QueryResponse.SUCCESS,
        };
      } else {
        await this.repository.update(paiement.id, {
          status: TransactionType.FAILED,
        });
        await this.administrationService.updateTransaction(
          process.env.API_KEY_PAYIN,
          transaction.id,
          {
            status: 'FAILED',
          },
        );
        return {
          status: QueryResponse.ERROR,
        };
      }
    } else {
      await this.repository.update(paiement.id, {
        status: TransactionType.FAILED,
      });
      await this.administrationService.updateTransaction(
        process.env.API_KEY_PAYIN,
        transaction.id,
        {
          status: 'FAILED',
        },
      );
      await this.administrationService.updateCompteReservation(
        process.env.API_KEY_PAYIN,
        reservation.id,
        {
          transactionStatus: 'FAILED',
        },
      );
      await this.administrationService.updateHistorique(
        process.env.API_KEY_PAYIN,
        historique.id,
        {
          status: 'FAILED',
        },
      );
      return {
        status: QueryResponse.ERROR,
      };
    }
  }

  async createHistorique(historique: any): Promise<CreateHistoriqueResultDto> {
    const history = await this.administrationService.createHistorique(
      process.env.API_KEY_PAYIN,
      historique,
    );
    if (history) {
      return {
        historique: history,
        status: QueryResponse.SUCCESS,
      };
    } else {
      return {
        historique: history,
        status: QueryResponse.ERROR,
      };
    }
  }

  async makeAbonnement(payload: MakeAbonnementDto) {
    const { amount, senderPhoneNumber, receiverPhoneNumber } = payload;
    const compteCollect = await this.administrationService.getUserData(
      process.env.API_KEY_PAYIN,
      this.configService.get<string>('COMPTE_COLLECTE'),
    );
    //get sender & receiver information
    const getSenderInfos = await this.administrationService.getUserData(
      process.env.API_KEY_PAYIN,
      senderPhoneNumber,
    );

    const getReceiverInfos = await this.administrationService.getUserData(
      process.env.API_KEY_PAYIN,
      receiverPhoneNumber,
    );
    if (parseInt(amount) > parseInt(getSenderInfos.solde)) {
      throw new HttpException('Solde insuffisant', HttpStatus.NOT_ACCEPTABLE);
    }
    //initialize payment
    const payment = new Payin();
    payment.amount = amount;
    payment.fees = this.getTransactionFees(
      parseInt(amount),
      getSenderInfos.premium,
    ).toString();
    payment.amountBeforeSending = getSenderInfos.solde;
    payment.reference = this.generateReference();
    payment.amountAfterSending = (
      parseInt(getSenderInfos.solde) - parseInt(amount)
    ).toString();
    payment.senderPhoneNumber = senderPhoneNumber;
    payment.receiverPhoneNumber = receiverPhoneNumber;
    await this.repository.save(payment);

    //initialize historique
    const historique = await this.createHistorique({
      sender: getSenderInfos,
      receiver: getReceiverInfos,
      senderIdentifiant: getSenderInfos.id,
      receiverIdentifiant: getReceiverInfos.id,
      referenceTransaction: payment.reference,
      transactionType: CollectType.ABONNEMENT,
      amount: amount,
      fees: this.getTransactionFees(
        parseInt(amount),
        getSenderInfos.premium,
      ).toString(),
      status: TransactionType.PENDING,
      icon: 'sync',
    });

    if (historique) {
      if (payment) {
        //initialize transaction
        const transaction: any =
          await this.administrationService.createTransaction(
            process.env.API_KEY_PAYIN,
            {
              amount: amount,
              amountBeforeSending: getSenderInfos.solde,
              amountAfterSending: (
                parseInt(getSenderInfos.solde) - parseInt(amount)
              ).toString(),
              senderPhoneNumber: senderPhoneNumber,
              reference: payment.reference,
              receiverPhoneNumber: receiverPhoneNumber,
              fees: this.getTransactionFees(
                parseInt(amount),
                getSenderInfos.premium,
              ).toString(),
              status: 'PENDING',
              type: CollectType.ABONNEMENT,
            },
          );

        if (transaction) {
          //debit sender account
          const debitSender = await this.administrationService.updateUser(
            process.env.API_KEY_PAYIN,
            getSenderInfos.id,
            {
              solde: (
                parseInt(getSenderInfos.solde) - parseInt(amount)
              ).toString(),
            },
          );
          if (debitSender.affected === 1) {
            //create reservation
            const reservation: any =
              await this.administrationService.createCompteReservation(
                process.env.API_KEY_PAYIN,
                {
                  amount: amount,
                  fees: this.getTransactionFees(
                    parseInt(amount),
                    getSenderInfos.premium,
                  ).toString(),
                  fundsToSend: amount,
                  transactionStatus: 'IN PROGRESS',
                  transactionType: CollectType.ABONNEMENT,
                },
              );
            if (reservation) {
              const creditCompteReservation =
                await this.administrationService.getUserData(
                  process.env.API_KEY_PAYIN,
                  this.configService.get<string>('COMPTE_RESERVATION'),
                );
              const credit = await this.administrationService.updateUser(
                process.env.API_KEY_PAYIN,
                creditCompteReservation.id,
                {
                  solde: (
                    parseInt(creditCompteReservation.solde) + parseInt(amount)
                  ).toString(),
                },
              );
              if (credit.affected === 1) {
                //credit collect account
                const creditCollectAccount =
                  await this.administrationService.createCompteCollecte(
                    process.env.API_KEY_PAYIN,
                    {
                      amount: amount,
                      collectType: CollectType.ABONNEMENT,
                    },
                  );
                if (creditCollectAccount) {
                  //update collect account
                  await this.administrationService.updateUser(
                    process.env.API_KEY_PAYIN,
                    compteCollect.id,
                    {
                      solde: (
                        parseInt(compteCollect.solde) + parseInt(amount)
                      ).toString(),
                    },
                  );
                  const debitReservation =
                    await this.administrationService.updateUser(
                      process.env.API_KEY_PAYIN,
                      creditCompteReservation.id,
                      {
                        solde: (
                          parseInt(creditCompteReservation.solde) -
                          parseInt(amount)
                        ).toString(),
                      },
                    );
                  if (debitReservation.affected === 1) {
                    //debit reservation account
                    await this.administrationService.updateCompteReservation(
                      process.env.API_KEY_PAYIN,
                      reservation.id,
                      {
                        transactionStatus: 'COMPLETED',
                      },
                    );
                    //update user info
                    await this.administrationService.updateUser(
                      process.env.API_KEY_PAYIN,
                      getSenderInfos.id,
                      {
                        premium: true,
                        premiumActivated: true,
                      },
                    );

                    //update historique
                    await this.administrationService.updateHistorique(
                      process.env.API_KEY_PAYIN,
                      historique.historique.id,
                      {
                        status: 'SUCCESS',
                      },
                    );

                    //update payment
                    await this.repository.update(payment.id, {
                      status: 'SUCCESS',
                    });

                    //update transaction
                    await this.administrationService.updateTransaction(
                      process.env.API_KEY_PAYIN,
                      transaction.id,
                      {
                        status: 'SUCCESS',
                      },
                    );
                  }
                  return {
                    status: TransactionType.SUCCESS,
                  };
                } else {
                  await this.administrationService.updateCompteReservation(
                    process.env.API_KEY_PAYIN,
                    reservation.id,
                    {
                      transactionStatus: 'FAILED',
                    },
                  );
                  // create historique
                  await this.administrationService.updateHistorique(
                    process.env.API_KEY_PAYIN,
                    historique.historique.id,
                    {
                      status: 'FAILED',
                    },
                  );
                  return {
                    status: QueryResponse.ERROR,
                  };
                }
              }
            }
          } else {
            return {
              message: 'Failed to debit sender account',
              status: QueryResponse.ERROR,
            };
          }
        }
      }
    }
  }

  /**
   * cron job to debit premium subscription every 28th of the month
   */
  @Cron('0 0 0 28 * *')
  /**
   * Debits premium subscription for all premium users.
   *
   * @return {Promise<void>} Promise that resolves when the operation is complete.
   */
  async debitPremium() {
    console.log('Debiting premium subscription...');
    const getPremiumUsers = await this.administrationService.getUsersPremium(
      process.env.API_KEY_PAYIN,
    );
    for (const user of getPremiumUsers) {
      const balanceAfterSending = parseInt(user.solde) - 2000;
      await this.administrationService.updateUser(
        process.env.API_KEY_PAYIN,
        user.id,
        {
          solde: balanceAfterSending.toString(),
          premiumActivated: true,
        },
      );
      await this.administrationService.createHistorique(
        process.env.API_KEY_PAYIN,
        {
          sender: user,
          receiver: user,
          senderIdentifiant: user.id,
          receiverIdentifiant: user.id,
          transactionType: CollectType.ABONNEMENT,
          referenceTransaction: 'ABONNEMENT',
          amount: '2000',
          fees: '0',
          status: 'SUCCESS',
          icon: 'sync',
        },
      );
      await this.administrationService.createCompteCollecte(
        process.env.API_KEY_PAYIN,
        {
          amount: '2000',
          collectType: CollectType.ABONNEMENT,
        },
      );
    }
  }

  @Cron('0 0 0 27 * *')
  /**
   * Changes the premium status of users.
   *
   * @return {Promise<void>} Returns a promise that resolves when the premium status of all users has been updated.
   */
  async changePremiumStatus() {
    console.log('Changing premium status...');
    const getPremiumUsers =
      await this.administrationService.changePremiumStatus(
        process.env.API_KEY_PAYIN,
      );
    for (const user of getPremiumUsers) {
      await this.administrationService.updateUser(
        process.env.API_KEY_PAYIN,
        user.id,
        {
          premiumActivated: false,
        },
      );
    }
  }

  async getPaymentByReference(reference: string): Promise<Payin> {
    return await this.repository.findOne({
      where: {
        reference,
      },
    });
  }

  async paymentRequest(payload: PaymentRequestDto): Promise<Payin> {
    const { amount, senderPhoneNumber, receiverPhoneNumber } = payload;
    const debitedUser = await this.administrationService.getUserData(
      process.env.API_KEY_PAYIN,
      senderPhoneNumber,
    );
    const creditedUser = await this.administrationService.getUserData(
      process.env.API_KEY_PAYIN,
      receiverPhoneNumber,
    );
    const paymentRequest = this.repository.create({
      amount,
      amountBeforeSending: debitedUser.solde,
      amountAfterSending: (
        parseInt(debitedUser.solde) - parseInt(amount)
      ).toString(),
      senderPhoneNumber: senderPhoneNumber,
      fees: '0',
      reference: this.generateReference(),
      receiverPhoneNumber: receiverPhoneNumber,
      status: TransactionType.PAYMENT_REQUEST_PENDING,
    });

    const result = await this.repository.save(paymentRequest);

    if (result) {
      //create a transaction
      await this.administrationService.createTransaction(
        process.env.API_KEY_PAYIN,
        {
          amount: amount,
          amountBeforeSending: creditedUser.solde,
          amountAfterSending: (
            parseInt(creditedUser.solde) + parseInt(amount)
          ).toString(),
          senderPhoneNumber: senderPhoneNumber,
          reference: result.reference,
          receiverPhoneNumber: receiverPhoneNumber,
          fees: '0',
          type: 'REQUETE DE PAIEMENT',
        },
      );
      //if payment request is successful we create an history
      await this.administrationService.createHistorique(
        process.env.API_KEY_PAYIN,
        {
          sender: debitedUser,
          receiver: creditedUser,
          senderIdentifiant: debitedUser.id,
          receiverIdentifiant: creditedUser.id,
          referenceTransaction: result.reference,
          transactionType: 'REQUETE DE PAIEMENT',
          amount: amount,
          fees: '0',
          status: 'PENDING',
          icon: 'send',
        },
      );
    } else {
      throw new BadRequestException('Le paiement a échoué');
    }

    return result;
  }

  async validatePaymentRequest(
    payload: ValidatePaymentDto,
    authUser: any,
  ): Promise<PaymentExecDto> {
    const { reference } = payload;
    const transaction =
      await this.administrationService.getTransactionByReference(
        process.env.API_KEY_PAYIN,
        reference,
      );
    if (authUser.numero !== transaction.senderPhoneNumber) {
      throw new BadRequestException('Vous ne pouvez pas valider ce paiement');
    }
    try {
      const paymentRequest = await this.repository.findOne({
        where: {
          reference,
        },
      });
      const paymentRequestHistory: any =
        await this.administrationService.getHistoriqueByReference(
          process.env.API_KEY_PAYIN,
          reference,
        );
      const debitedUser = await this.administrationService.getUserData(
        process.env.API_KEY_PAYIN,
        paymentRequest.senderPhoneNumber,
      );
      const creditedUser = await this.administrationService.getUserData(
        process.env.API_KEY_PAYIN,
        paymentRequest.receiverPhoneNumber,
      );
      //on débite la somme du paiement au client
      const cost = (
        parseInt(paymentRequest.amount) + parseInt(paymentRequest.fees)
      ).toString();
      const balanceAfterSending = parseInt(debitedUser.solde) - parseInt(cost);
      await this.administrationService.updateUser(
        process.env.API_KEY_PAYIN,
        debitedUser.id,
        {
          solde: balanceAfterSending.toString(),
        },
      );
      //apres avoir debiter la somme on credite le compte de reservation
      const reservation: any =
        await this.administrationService.createCompteReservation(
          process.env.API_KEY_PAYIN,
          {
            amount: paymentRequest.amount,
            fundsToSend: cost,
            fees: '0',
            transactionStatus: 'IN PROGRESS',
            transactionType: 'REQUETE DE PAIEMENT',
          },
        );
      if (reservation) {
        const compteReservation = await this.administrationService.getUserData(
          process.env.API_KEY_PAYIN,
          this.configService.get<string>('COMPTE_RESERVATION'),
        );

        if (compteReservation) {
          await this.administrationService.updateUser(
            process.env.API_KEY_PAYIN,
            compteReservation.id,
            {
              solde: (
                parseInt(compteReservation.solde) + parseInt(cost)
              ).toString(),
            },
          );
        }
      }
      //on credite le compte du beneficiaire
      const updateReceiverBalance = await this.administrationService.updateUser(
        process.env.API_KEY_PAYIN,
        creditedUser.id,
        {
          solde: (
            parseInt(creditedUser.solde) + parseInt(paymentRequest.amount)
          ).toString(),
        },
      );
      if (updateReceiverBalance.affected === 1) {
        //on debite le compte de reservation
        const updateReservationBalance =
          await this.administrationService.updateCompteReservation(
            process.env.API_KEY_PAYIN,
            reservation.id,
            {
              amount: (
                parseInt(reservation.amount) - parseInt(cost)
              ).toString(),
            },
          );
        if (updateReservationBalance.affected === 1) {
          const updateReservation =
            await this.administrationService.updateCompteReservation(
              process.env.API_KEY_PAYIN,
              reservation.id,
              {
                transactionStatus: 'COMPLETED',
              },
            );

          if (updateReservation.affected === 1) {
            //on update le statut de paiement de la requête de paiement
            await this.repository.update(paymentRequest.id, {
              status: TransactionType.PAYMENT_REQUEST_SUCCESS,
            });
            //on update le statut de la transaction
            await this.administrationService.updateTransaction(
              process.env.API_KEY_PAYIN,
              transaction.id,
              {
                status: 'SUCCESS',
              },
            );
            //on update le statut de la requête de paiement dans l'historique
            await this.administrationService.updateHistorique(
              process.env.API_KEY_PAYIN,
              paymentRequestHistory.id,
              {
                status: 'SUCCESS',
              },
            );
            //on credite le compte de collecte
            const compteCollecte = await this.administrationService.getUserData(
              process.env.API_KEY_PAYIN,
              this.configService.get<string>('COMPTE_COLLECTE'),
            );
            if (compteCollecte) {
              await this.administrationService.updateUser(
                process.env.API_KEY_PAYIN,
                compteCollecte.id,
                {
                  solde: (
                    parseInt(compteCollecte.solde) +
                    parseInt(paymentRequest.fees)
                  ).toString(),
                },
              );
            }
          }
        }
      }

      return {
        status: QueryResponse.SUCCESS,
      };
    } catch (error) {
      console.log('An error occurred:', error);
      return {
        status: QueryResponse.ERROR,
      };
    }
  }

  async getAllPendingPaymentForAMerchant(
    receiverPhoneNumber: string,
  ): Promise<Payin[]> {
    return await this.repository.find({
      where: {
        receiverPhoneNumber,
        status: TransactionType.PAYMENT_REQUEST_PENDING,
      },
    });
  }

  async getAllPaiements(): Promise<any[]> {
    return await this.repository.findAndCount();
  }
}
