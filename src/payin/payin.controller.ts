import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MakePaiementDto } from './dto/make-paiement.dto';
import { PaymentInitDto } from './dto/paiement-init.dto';
import { Payin } from './entities/paiement.entity';
import { PaymentDebitDto } from './dto/paiement-debit.dto';
import { PaymentRequestDto } from './enums/paiement-request.dto';
import { ValidatePaymentDto } from './enums/validate-paiement.dto';
import { MakeAbonnementDto } from './dto/make-abonnement.dto';
import { PayinService } from './payin.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { FullAuthGuard } from 'src/full-auth-guard/full-auth-guard.guard';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@UseGuards(FullAuthGuard)
@ApiHeader({
  name: 'authenticationtoken',
  description: 'authenticationtoken',
  required: true,
})
@Controller('paiement')
export class PayinController {
  constructor(
    private readonly payinService: PayinService,
    @InjectQueue('payin-queue') private payinQueue: Queue,
  ) {}

  @Post('payin')
  async createPayin(@Body() payload: MakePaiementDto): Promise<any> {
    await this.payinService.addPayinJob(payload);
    return { message: 'Transaction added to queue', date: new Date() };
  }

  @Get('queue/pending')
  async getPendingJobs() {
    const jobs = await this.payinQueue.getWaiting();
    return jobs;
  }

  @Get('queue/active')
  async getActiveJobs() {
    const jobs = await this.payinQueue.getActive();
    return jobs;
  }

  @Get('queue/completed')
  async getCompletedJobs() {
    const jobs = await this.payinQueue.getCompleted();
    return jobs;
  }

  @Get('queue/failed')
  async getFailedJobs() {
    const jobs = await this.payinQueue.getFailed();
    return jobs;
  }

  @Get('queue/job/:id')
  async getJobById(@Param('id') id: string) {
    const job = await this.payinQueue.getJob(id);
    return job;
  }

  @Post('initPayment')
  async initPayment(@Body() payload: MakePaiementDto): Promise<PaymentInitDto> {
    return await this.payinService.paiementInitializer(payload);
  }

  @Post('debitPayment')
  async debitPayment(
    @Body()
    payload: {
      paiement: Payin;
      transaction: any;
      historique: any;
      amount: string;
      senderInfos: any;
      fees: string;
      receiverNumber: string;
    },
  ): Promise<PaymentDebitDto> {
    return await this.payinService.paymentDebit(
      payload.paiement,
      payload.transaction,
      payload.historique,
      payload.amount,
      payload.senderInfos,
      payload.fees,
      payload.receiverNumber,
    );
  }

  @Post('execPayment')
  async execPayment(
    @Body()
    payload: {
      senderInfos: any;
      reservation: any;
      receiverNumber: string;
      amount: string;
      paiement: Payin;
      transaction: any;
      fees: string;
      abonnement?: boolean;
      historique: any;
    },
  ) {
    return await this.payinService.sendPayment(
      payload.senderInfos,
      payload.reservation,
      payload.receiverNumber,
      payload.amount,
      payload.paiement,
      payload.transaction,
      payload.fees,
      payload.historique,
    );
  }

  @Get('paiementByReference')
  async getPaiementByReference(@Query('reference') reference: string) {
    return await this.payinService.getPaymentByReference(reference);
  }

  @Post('create_payment_request')
  async createPaymentRequest(@Body() payload: PaymentRequestDto) {
    return await this.payinService.paymentRequest(payload);
  }

  @Post('validate-payment-request')
  async validatePaymentRequest(
    @Body() payload: ValidatePaymentDto,
    @Query('user') user: any,
  ) {
    return await this.payinService.validatePaymentRequest(payload, user);
  }

  @Get('all-pending-payment-for-a-merchant')
  async getAllPendingPaymentForAMerchant(
    @Query('receiverPhoneNumber') receiverPhoneNumber: string,
  ) {
    return await this.payinService.getAllPendingPaymentForAMerchant(
      receiverPhoneNumber,
    );
  }

  @Post('make-subscription')
  async makeAbonnement(@Body() payload: MakeAbonnementDto) {
    return await this.payinService.makeAbonnement(payload);
  }

  @Get('all-paiements')
  @ApiBearerAuth()
  async getAllPaiements(): Promise<any[]> {
    return await this.payinService.getAllPaiements();
  }
}
