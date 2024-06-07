import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MakeAbonnementDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  amount: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  senderPhoneNumber: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  receiverPhoneNumber: string;
}
