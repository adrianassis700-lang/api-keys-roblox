const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();

app.use(express.json());

// Substitua pelas chaves que você copiou no celular
const supabaseUrl = 'SUA_URL_DO_SUPABASE';
const supabaseKey = 'SUA_CHAVE_ANON_PUBLIC';
const supabase = createClient(supabaseUrl, supabaseKey);

app.post('/api/validar', async (req, res) => {
    const { key, userid } = req.body;

    if (!key || !userid) {
        return res.json({ valido: false, mensagem: "Dados incompletos." });
    }

    const { data, error } = await supabase
        .from('keys_sistema')
        .select('*')
        .eq('chave', key)
        .single();

    if (error || !data) {
        return res.json({ valido: false, mensagem: "Key não encontrada." });
    }

    if (data.usada && data.user_id !== String(userid)) {
        return res.json({ valido: false, mensagem: "Key já utilizada por outro usuário." });
    }

    if (!data.usada) {
        await supabase
            .from('keys_sistema')
            .update({ usada: true, user_id: String(userid) })
            .eq('chave', key);
    }

    return res.json({ valido: true, mensagem: "Key validada com sucesso!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
