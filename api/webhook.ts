import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const payload = req.body;
        console.log('[webhook] Cakto payload received:', payload);

        // Cakto typically sends: status, customer.email, product.name
        // Status can be 'paid', 'pending', 'refunded', etc.
        const { status, customer, product } = payload;

        if (!customer?.email) {
            return res.status(400).json({ error: 'Missing customer email' });
        }

        if (status === 'paid' || status === 'completed') {
            let tier = 'free';
            const productName = product?.name?.toLowerCase() || '';

            if (productName.includes('turbo')) {
                tier = 'turbo';
            } else if (productName.includes('pro')) {
                tier = 'pro';
            }

            console.log(`[webhook] Upgrading ${customer.email} to tier: ${tier}`);

            const { error } = await supabase
                .from('profiles')
                .update({ tier, updated_at: new Date().toISOString() })
                .eq('email', customer.email);

            if (error) {
                console.error('[webhook] Database update error:', error);
                return res.status(500).json({ error: 'Failed to update user tier' });
            }
        }

        return res.status(200).json({ success: true });
    } catch (err: any) {
        console.error('[webhook] Error processing request:', err.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
