import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParser from 'csv-parse';
import fs from 'fs';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Request {
  filePath: string;
}

interface CsvTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

interface TransactionsAndCategories {
  transactions: CsvTransaction[];
  categories: string[];
}

class ImportTransactionsService {
  private async parseCsvFile(
    filePath: string,
  ): Promise<TransactionsAndCategories> {
    const transactions: CsvTransaction[] = [];
    const categories: string[] = [];

    const csvStream = fs.createReadStream(filePath);
    const parseCsv = csvStream.pipe(
      csvParser({ from_line: 2, skip_lines_with_error: true }),
    );

    parseCsv.on('data', line => {
      const [title, type, value, category] = line.map((item: string) =>
        item.trim(),
      );

      if (!title || !type || !value) {
        return;
      }

      categories.push(category);

      transactions.push({
        title,
        value,
        type,
        category,
      });
    });

    await new Promise(resolve => parseCsv.on('end', resolve));
    await fs.promises.unlink(filePath);

    return { transactions, categories };
  }

  async addCategories(categories: string[]): Promise<Category[]> {
    const categoriesRepository = getRepository(Category);

    const existingCategories = await categoriesRepository.find({
      select: ['title'],
      where: { title: In(categories) },
    });
    const existingCategoriesTitles = existingCategories.map(
      category => category.title,
    );

    const uniqueCategories = [...new Set(categories)];
    const categoriesToAdd = uniqueCategories.filter(
      category => !existingCategoriesTitles.includes(category),
    );

    const newCategories = categoriesRepository.create(
      categoriesToAdd.map((title: string) => ({ title })),
    );

    await categoriesRepository.save(newCategories);

    return [...newCategories, ...existingCategories];
  }

  async execute({ filePath }: Request): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const { transactions, categories } = await this.parseCsvFile(filePath);

    const categoryObjects = await this.addCategories(categories);

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: categoryObjects.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
