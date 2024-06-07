import { Test, TestingModule } from '@nestjs/testing';
import { PayinController } from './payin.controller';

describe('PayinController', () => {
  let controller: PayinController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayinController],
    }).compile();

    controller = module.get<PayinController>(PayinController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
