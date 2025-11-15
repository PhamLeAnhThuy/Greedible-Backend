'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase/client'

type Customer = {
  customer_id: number;
  customer_name: string;
  phone: string;
  password: string;
  loyalty_point: number;
  email: string;
  address: string;
};
export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  // Define a TypeScript type for your customer
  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase.from('customer').select('*')
      if (error) console.error(error)
      else setCustomers(data || [])
    }
    fetchCustomers()
  }, [])

  return (
    <div>
      <div>hello</div>
      <h1>Customers</h1>
      <ul>
        {customers.map((c: any) => (
          <li key={c.customer_id}>{c.customer_name}</li>
          
        ))}
      </ul>
    </div>
  )
}
