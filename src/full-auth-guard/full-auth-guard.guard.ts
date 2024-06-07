import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FULL_AUTH_GUARD } from './full-auth.strategy';

@Injectable()
export class FullAuthGuard extends AuthGuard(FULL_AUTH_GUARD) {}
