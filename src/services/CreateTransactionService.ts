import { getRepository } from 'typeorm';

import AppError from '../errors/AppError';
import Category from '../models/Category';
import Transaction from '../models/Transaction';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    if (!title || !value || !type || !category) {
      throw new AppError('Invalid input, check if all fields are filled.');
    }

    const categoryRepository = getRepository(Category);

    let existentCategory = await categoryRepository.findOne({
      where: {
        title: category,
      },
    });
    if (!existentCategory) {
      const newCategory = categoryRepository.create({ title: category });
      existentCategory = await categoryRepository.save(newCategory);
    }

    const transactionsRepository = getRepository(Transaction);
    const newTransaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: existentCategory.id,
    });

    await transactionsRepository.save(newTransaction);

    return newTransaction;
  }
}

export default CreateTransactionService;
