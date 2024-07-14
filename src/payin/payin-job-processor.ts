import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PayinService } from './payin.service';
import { QueryResponse } from './enums/QueryResponse.enum';

@Processor('payin-queue')
export class PayinJobProcessor {
  constructor(private readonly payinService: PayinService) {}
  @Process()
  async handlePayinJob(job: Job) {
    try {
      //initialiser paiement
      console.log('payment init job received');
      const initPayin = await this.payinService.paiementInitializer(job.data);
      if (initPayin.status === QueryResponse.SUCCESS) {
        //if payment init is successful
        //debit paiement
        const debitPayin = await this.payinService.paymentDebit(
          initPayin.payment,
          initPayin.transaction,
          initPayin.historique,
          initPayin.amount,
          initPayin.senderInfos,
          initPayin.fees,
          initPayin.receiverNumber,
        );
        if (debitPayin.status === QueryResponse.SUCCESS) {
          //if payment debit is successful
          //envoyer paiement
          const exec = await this.payinService.sendPayment(
            debitPayin.senderInfos,
            debitPayin.reservation,
            debitPayin.receiverNumber,
            debitPayin.amount,
            debitPayin.paiement,
            debitPayin.transaction,
            debitPayin.fees,
            initPayin.historique,
          );
          const data = {
            status: exec.status,
            message: 'paiement success',
            date: new Date(),
          };
          console.log(data);
        }
      }
    } catch (error) {
      console.log(error);
    }
  }
}
