import { Request, Response } from 'express';
import { sendPayrollEmail } from '../services/emailService';

// POST /api/payroll/send-email
// Body: { period, payrollData, totalPayroll, isReminder }
export const sendPayrollEmailController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period, payrollData, totalPayroll, isReminder } = req.body;

    if (!period || !payrollData || totalPayroll === undefined) {
      res.status(400).json({ message: 'Missing required fields: period, payrollData, totalPayroll' });
      return;
    }

    res.status(200).json({ message: isReminder ? 'Reminder sent successfully' : 'Payroll request sent successfully' });

    // Non-blocking send
    sendPayrollEmail({ period, payrollData, totalPayroll, isReminder: !!isReminder })
      .catch(err => console.error('[PayrollController] Email error:', err.message));

  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to send payroll email' });
  }
};
