import { IsNotEmpty, IsString } from 'class-validator';
import { Payin } from '../entities/paiement.entity';
import { QueryResponse } from '../enums/QueryResponse.enum';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentDebitDto {
  @IsNotEmpty()
  @ApiProperty()
  paiement: Payin;

  @IsNotEmpty()
  @ApiProperty()
  transaction: any;

  @ApiProperty()
  reservation: any | null;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  amount: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  receiverNumber: string;

  @ApiProperty()
  @IsNotEmpty()
  senderInfos: any;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  fees: string;

  @ApiProperty()
  status: QueryResponse;
}
