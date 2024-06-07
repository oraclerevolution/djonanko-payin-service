import { IsNotEmpty, IsString } from 'class-validator';
import { Payin } from '../entities/paiement.entity';
import { QueryResponse } from '../enums/QueryResponse.enum';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentInitDto {
  @IsNotEmpty()
  @ApiProperty()
  payment: Payin;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  fees: string;

  @IsNotEmpty()
  @ApiProperty()
  historique: any;

  @IsNotEmpty()
  @ApiProperty()
  transaction: any;

  @ApiProperty()
  @IsNotEmpty()
  senderInfos: any;

  @ApiProperty()
  @IsNotEmpty()
  status: QueryResponse;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  receiverNumber: string;
}
