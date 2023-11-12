'use server';

import { z } from "zod";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
const InvoiceSchema = z.object({
    id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'],{
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = InvoiceSchema.omit({ id: true, date: true });
export type State = {
    errors?: {
      customerId?: string[];
      amount?: string[];
      status?: string[];
    };
    message?: string | null;
  };

export async function createInvoice(prevState   : State, formData: FormData) {
    const validateFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
    });
    if (!validateFields.success) {
        return {
            errors: validateFields.error.flatten().fieldErrors,
            message : 'Missing Fields. Failed to Create Invoice.'
        }
    }
    const { customerId, amount, status } = validateFields.data;

    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];
try{
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
}catch(e){ 
    return {message : "Error in creating invoice"}
 }
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

// Use Zod to update the expected types
const UpdateInvoice = InvoiceSchema.omit({ date: true, id: true });
 
// ...
 
export async function updateInvoice(id: string,prevState : State , formData: FormData) {
    const validateFields = UpdateInvoice.safeParse({    
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
    });
  if(!validateFields.success){
    return {
        errors: validateFields.error.flatten().fieldErrors,
        message : 'Missing Fields. Failed to Update Invoice.'
    
    }
  }
  const { customerId, amount, status } = validateFields.data;
 
  const amountInCents = amount * 100;
 try{
  await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
 }catch(e){
    return {message : "Error in updating invoice"}
 } 
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}


 
export async function deleteInvoice(id: string) {
    throw new Error('Failed to Delete Invoice');
    try{
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
    }   catch(e){       
        return {message : "Error in deleting invoice"}
    }
}


export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
  ) {
    try {
      await signIn('credentials', Object.fromEntries(formData));
    } catch (error) {
      if ((error as Error).message.includes('CredentialsSignin')) {
        return 'CredentialSignin';
      }
      throw error;
    }
  }