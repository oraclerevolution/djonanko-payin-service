import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MakePaiementDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  senderPhoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  receiverPhoneNumber: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  fees?: string;
}
