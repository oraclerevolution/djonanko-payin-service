import { Test, TestingModule } from '@nestjs/testing';
import { PayinService } from './payin.service';

describe('PayinService', () => {
  let service: PayinService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayinService],
    }).compile();

    service = module.get<PayinService>(PayinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
