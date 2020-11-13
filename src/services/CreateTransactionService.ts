import { getCustomRepository, getRepository } from 'typeorm';

import AppError from '../errors/AppError';
import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

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

    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const { total } = await transactionsRepository.getBalance();

    if (type === 'outcome' && total < value) {
      throw new AppError('Not enough balance.');
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
    // const newCategory = categoryRepository.create({ title: category });
    // const existentCategory = await categoryRepository.save(newCategory);

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
