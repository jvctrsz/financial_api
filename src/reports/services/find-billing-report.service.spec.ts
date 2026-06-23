import { BadRequestException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { FindBillingReportService } from './find-billing-report.service';

describe('FindBillingReportService', () => {
  let prisma: MockPrismaService;
  let service: FindBillingReportService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new FindBillingReportService(prisma as unknown as PrismaService);
    prisma.transaction.findMany.mockResolvedValue([]);
  });

  it('deve retornar transações e total corretos para o mês informado', async () => {
    prisma.transaction.findMany.mockResolvedValue([
      {
        id: 'transaction-1',
        cardId: 'card-1',
        amount: 100,
        description: 'Mercado',
        transactionDate: new Date('2025-04-30T00:00:00.000Z'),
        billingDate: new Date('2025-05-01T00:00:00.000Z'),
        card: { id: 'card-1', name: 'Nubank' },
      },
    ]);

    await expect(
      service.findBillingReport('user-1', '2025-05'),
    ).resolves.toEqual({
      month: '2025-05',
      total: 100,
      cards: [
        {
          cardId: 'card-1',
          cardName: 'Nubank',
          total: 100,
          transactions: [
            {
              id: 'transaction-1',
              description: 'Mercado',
              amount: 100,
              transactionDate: '2025-04-30',
              billingDate: '2025-05-01',
            },
          ],
        },
      ],
    });
  });

  it('deve buscar apenas CREDIT ativo do usuario no mês de fatura', async () => {
    await service.findBillingReport('user-1', '2025-05');

    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        type: TransactionType.CREDIT,
        deletedAt: null,
        billingDate: {
          gte: new Date('2025-05-01T00:00:00.000Z'),
          lt: new Date('2025-06-01T00:00:00.000Z'),
        },
      },
      include: {
        card: true,
      },
      orderBy: {
        transactionDate: 'desc',
      },
    });
  });

  it('deve agrupar corretamente quando houver mais de um cartao', async () => {
    prisma.transaction.findMany.mockResolvedValue([
      {
        id: 'transaction-1',
        cardId: 'card-1',
        amount: 100,
        description: 'Mercado',
        transactionDate: new Date('2025-04-30T00:00:00.000Z'),
        billingDate: new Date('2025-05-01T00:00:00.000Z'),
        card: { id: 'card-1', name: 'Nubank' },
      },
      {
        id: 'transaction-2',
        cardId: 'card-2',
        amount: 250,
        description: 'Farmacia',
        transactionDate: new Date('2025-05-02T00:00:00.000Z'),
        billingDate: new Date('2025-05-01T00:00:00.000Z'),
        card: { id: 'card-2', name: 'Inter' },
      },
    ]);

    await expect(
      service.findBillingReport('user-1', '2025-05'),
    ).resolves.toEqual(
      expect.objectContaining({
        total: 350,
        cards: expect.arrayContaining([
          expect.objectContaining({ cardId: 'card-1', total: 100 }),
          expect.objectContaining({ cardId: 'card-2', total: 250 }),
        ]),
      }),
    );
  });

  it('deve retornar total zerado para mês sem transações', async () => {
    await expect(
      service.findBillingReport('user-1', '2025-05'),
    ).resolves.toEqual({
      month: '2025-05',
      total: 0,
      cards: [],
    });
  });

  it('deve rejeitar month fora do formato YYYY-MM', async () => {
    await expect(
      service.findBillingReport('user-1', '2025/05'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
