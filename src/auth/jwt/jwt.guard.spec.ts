import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { JwtGuard } from './jwt.guard';

describe('JwtGuard', () => {
  let guard: JwtGuard;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtGuard,
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
      ],
    }).compile();
    guard = module.get(JwtGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
});
