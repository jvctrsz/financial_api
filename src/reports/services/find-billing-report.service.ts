import { BadRequestException, Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { parseDateOnly } from '../../salaries/utils/date-only.util';
import { decimalToNumber, formatMonth } from './report-utils';

type BillingTransaction = {
  id: string;
  cardId: string | null;
  amount: unknown;
  description: string;
  transactionDate: Date;
  billingDate: Date;
  card: {
    id: string;
    name: string;
  } | null;
};

@Injectable()
export class FindBillingReportService {
  constructor(private readonly prisma: PrismaService) {}

  findBillingReport = async (userId: string, month: string) => {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('Informe month no formato YYYY-MM.');
    }

    const billingMonth = parseDateOnly(`${month}-01`);
    const nextBillingMonth = new Date(
      Date.UTC(
        billingMonth.getUTCFullYear(),
        billingMonth.getUTCMonth() + 1,
        1,
      ),
    );

    const transactions = (await this.prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.CREDIT,
        deletedAt: null,
        billingDate: {
          gte: billingMonth,
          lt: nextBillingMonth,
        },
      },
      include: {
        card: true,
      },
      orderBy: {
        transactionDate: 'desc',
      },
    })) as BillingTransaction[];

    const cards = new Map<
      string,
      {
        cardId: string | null;
        cardName: string;
        total: number;
        transactions: BillingTransaction[];
      }
    >();

    for (const transaction of transactions) {
      const cardKey = transaction.cardId ?? 'without-card';
      const cardReport = cards.get(cardKey) ?? {
        cardId: transaction.card?.id ?? transaction.cardId,
        cardName: transaction.card?.name ?? 'Sem cartão',
        total: 0,
        transactions: [],
      };

      cardReport.total += decimalToNumber(transaction.amount);
      cardReport.transactions.push(transaction);
      cards.set(cardKey, cardReport);
    }

    const groupedCards = Array.from(cards.values()).map((card) => ({
      cardId: card.cardId,
      cardName: card.cardName,
      total: card.total,
      transactions: card.transactions.map((transaction) => ({
        id: transaction.id,
        description: transaction.description,
        amount: decimalToNumber(transaction.amount),
        transactionDate: transaction.transactionDate.toISOString().slice(0, 10),
        billingDate: transaction.billingDate.toISOString().slice(0, 10),
      })),
    }));

    return {
      month: formatMonth(billingMonth),
      total: groupedCards.reduce((total, card) => total + card.total, 0),
      cards: groupedCards,
    };
  };
}
