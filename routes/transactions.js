import { Router } from 'express';
import { ObjectId } from 'mongodb';
const router = Router();
import { transactionData } from '../data/index.js';
import validation from '../validation.js';
import xss from "xss"
import moment from 'moment';

import { exportToExcel } from '../data/excel.js';


router.route('/new').get(async (req, res) => {
  // Render add new transcation HTML form
  if (!req.session.user) {
    return res.redirect('/login')
  }
  res.render('addtransaction')
})
  .post(async (req, res) => {

    if (!req.session.user) {
      return res.redirect('/login')
    }
    let session_data = req.session.user;
    const transactionPostData = req.body;
    if (!transactionData || Object.keys(transactionPostData).length === 0) {
      return res
        .status(400).render('error', { error_occured: "No data in body part" })
    }
    let user_id = req.session.user.id.trim();
    let description = xss(req.body.description).trim()
    let category = xss(req.body.category).trim()
    let amount = xss(req.body.amount).trim();
    let transaction_date = xss(req.body.transaction_date).trim();
    let paymentType = xss(req.body.paymentType).trim()

    let errors = [];

    // To do: validate for date
    try {
      transaction_date = validation.checkDate(transaction_date, 'Transaction Date')
    } catch (e) {
      errors.push(e)
    }

    try {
      paymentType = validation.checkString(paymentType, 'Payment Type');
    } catch (e) {
      errors.push(e);
    }

    try {
      description = validation.checkString(description, 'Description');
    } catch (e) {
      errors.push(e);
    }

    try {
      amount = Number(amount);
      transactionPostData.amount = validation.checkNumber(amount, 'Amount');
    } catch (e) {
      errors.push(e);
    }

    try {
      category = validation.checkString(category, 'Category');
    } catch (e) {
      errors.push(e);
    }

    try {
      user_id = validation.checkId(user_id, 'User ID');
    } catch (e) {
      errors.push(e);
    }


    if (errors.length > 0) {
      res.render('addtransaction', { transaction, errors })
      return;
    }

    try {

      const newTransaction = await transactionData.addTransaction(user_id, paymentType, amount, description, category, transaction_date)

      const latestTransactions = await transactionData.getLatestTransactions(session_data.id)

      if (newTransaction) {
        return res.render('addtransaction', {successMessage: "Transaction added successfully!"})
      }

      
    } catch (e) {
      return res.status(500).json({ error: e });
    }
  })


// route for indivisual transactions to view, edit, delete

router
  .route('/seeAllTransaction')
  .get(async (req, res) => {

    if (!req.session.user) {
      return res.redirect('/login')
    }
    let userId = req.session.user.id
    try {
      let result = await transactionData.getAllTransactions(userId)

      return res.render('seeAllTransaction', {
        transactions: result.reverse()
      })
    } catch (e) {
      return res.status(404).json({ error: e });
    }
  })

router
  .route('/seeAllTransaction/filters')
  .get(async (req, res) => {
    let userId = req.session.user.id
    let { start_date, end_date, category } = req.query;
    if (!req.session.user) {
      return res.redirect('/login')
    }

    let errors = []
    try {

      if (!start_date) {
        start_date = moment('2021-01-01', 'YYYY-MM-DD').format('YYYY-MM-DD');
      }
      if (!end_date) {
        end_date = moment().format('YYYY-MM-DD')
      }


      // validate start and end dates

      let start = new Date(start_date);
      let end = new Date(end_date);
      if (start > end) {
        throw 'Start date must be before end date';
      }

    } catch (error) {
      errors.push(error)
    }

    try {
      if (errors.length > 0) {
        const transactions = await transactionData.getTransactionsByDateRangeAndCategoryWithoutDateFormat(userId, start_date, end_date, category)
        res.render('seeAllTransaction', { transactions, start: start_date, end: end_date, cat: category, errors })
        return;
      }
    } catch (e) {
      console.log(e)
      return res.status(400).json({ error: e });
    }
    try {
      // get transactions with given category and date range
      const transactions = await transactionData.getTransactionsByDateRangeAndCategoryWithoutDateFormat(userId, start_date, end_date, category)

      return res.render('seeAllTransaction', { transactions, start: start_date, end: end_date, cat: category });
    } catch (e) {
      console.log(e)
      return res.status(400).json({ error: e });
    }
  })




router
  .route('/:id')
  .get(async (req, res) => {

    if (!req.session.user) {
      return res.redirect('/login')
    }

    
    try {
      req.params.id = validation.checkId(req.params.id, 'Id URL Param');
    } catch (e) {
      return res.status(400).json({ error: e });
    }
    try {
      let transaction = await transactionData.getTransaction(req.params.id)
      return res.render('updatetransaction', { transaction })
    } catch (e) {
      return res.status(404).json({ error: e });
    }
  })
  .put(async (req, res) => {

    if (!req.session.user) {
      return res.redirect('/login')
    }

    const updatedData = req.body;

    updatedData['user_id'] = req.session.user.id
    updatedData['amount'] = Number(updatedData.amount)

    let errors = []
    try {
      req.params.id = validation.checkId(req.params.id, 'ID url param');
    } catch (error) {
      errors.push(error)
    }

    try {
      updatedData.description = validation.checkString(updatedData.description, 'Description');
    } catch (error) {
      errors.push(error)
    }

    try {
      updatedData.category = validation.checkString(updatedData.category, 'category');
    } catch (error) {
      errors.push(error)
    }

    try {
      updatedData.amount = validation.checkNumber(updatedData.amount, 'Amount')
    } catch (error) {
      errors.push(error)
    }

    try {
      updatedData.transaction_date = validation.checkDate(updatedData.transaction_date, 'Transaction Date')
    } catch (error) {
      errors.push(error)
    }

    try {
      updatedData.paymentType = validation.checkString(updatedData.paymentType, 'Payment Type')
    } catch (error) {
      errors.push(error)
    }

    try {
      updatedData.user_id = validation.checkId(
        updatedData.user_id,
        'User ID'
      );
    } catch (error) {
      errors.push(error)
    }

    try {
      if (errors.length > 0) {
        const transaction = await transactionData.updateTransaction(
          req.params.id,
          updatedData
        );
        res.render(res.render('updatetransaction', { transaction, errors }))
      }
    } catch (error) {
      return res.status(400).json({ error: error });
    }



    try {
      const updatedTransaction = await transactionData.updateTransaction(
        req.params.id,
        updatedData
      );


      return res.json({ "update": true })

    } catch (e) {
      
      let status = e[0];
      let message = e[1];
      return res.status(status).json({ error: message });
    }
  })
  .delete(async (req, res) => {

    if (!req.session.user) {
      return res.redirect('/login')
    }

    try {
      req.params.id = validation.checkId(req.params.id, 'Id URL Param');
    } catch (e) {
      
      return res.status(400).json({ error: e });
    }
    try {
      let deletedTransaction = await transactionData.removeTransaction(req.params.id)
      return res.status(200).json(deletedTransaction);
    } catch (e) {
      console.log(e)
      let status = e[0];
      let message = e[1];
      return res.status(status).json({ error: message });
    }
  });

router.route('/seeAllTransaction/export').get(async (req, res) => {


  //Render add new transcation HTML form
  if (!req.session.user) {
    return res.redirect('/login')
  }
  let session = req.session.user;
  //console.log()
  let user_id = session.id
  console.log(user_id);
  let result = '';
  let result1 = await transactionData.getAllTransactions(user_id);
  try {
    result = exportToExcel(user_id)
    return res.render('seeAllTransaction', { success: result, transactions: result1.reverse() });
  }
  catch (e) {
    console.log(e);
  }


})

export default router