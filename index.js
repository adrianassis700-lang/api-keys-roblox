const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use(express.json());

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept'
    );
    res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, OPTIONS'
    );

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

// Supabase
const supabaseUrl = 'https://yqxtabfebukvqexvaejs.supabase.co';

// IMPORTANTE:
// Coloque a chave anon em uma variável de ambiente.
// Não coloque service_role aqui.
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
    console.error('❌ SUPABASE_KEY não configurada.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Teste da API
app.get('/', (req, res) => {
    return res.json({
        status: 'API Online!',
        mensagem: 'Servidor rodando perfeitamente.'
    });
});

/*
====================================================
VALIDAÇÃO DA KEY NO ROBLOX
====================================================

Fluxo:

Discord:
    usada = false
    user_id = "Nome | DiscordID"

Roblox:
    envia key + userid

API:
    1. Procura a Key.
    2. Verifica se ela já foi consumida.
    3. Confere o ID do Roblox com o ID vinculado.
    4. Se estiver correto, muda usada para true.
====================================================
*/

app.post('/api/validar', async (req, res) => {
    try {
        const { key, userid } = req.body;

        if (!key || !userid) {
            return res.json({
                valido: false,
                mensagem: 'Dados incompletos.'
            });
        }

        const chaveLimpa = String(key).trim().toUpperCase();
        const idUsuario = String(userid).trim();

        // Busca a Key
        const { data, error } = await supabase
            .from('keys_sistema')
            .select('id, chave, usada, user_id')
            .ilike('chave', chaveLimpa)
            .maybeSingle();

        if (error) {
            console.error('❌ Erro ao consultar Supabase:', error);

            return res.status(500).json({
                valido: false,
                mensagem: 'Erro ao consultar o sistema.'
            });
        }

        if (!data) {
            return res.json({
                valido: false,
                mensagem: 'Key não encontrada.'
            });
        }

        /*
        ==============================================
        A KEY JÁ FOI CONSUMIDA NO ROBLOX
        ==============================================
        */

        if (data.usada === true) {
            return res.json({
                valido: false,
                mensagem: 'Esta key já foi utilizada no Roblox.'
            });
        }

        /*
        ==============================================
        VERIFICA O DONO DA KEY
        ==============================================

        O Discord salva:

        user_id = "Nome | 123456789"

        Aqui extraímos somente o ID para comparar
        com o userid enviado pelo Roblox.
        */

        if (!data.user_id) {
            return res.json({
                valido: false,
                mensagem: 'Esta key ainda não foi vinculada a uma conta Discord.'
            });
        }

        const userIdSalvo = String(data.user_id)
            .split('|')
            .pop()
            .trim();

        /*
        ==============================================
        ID DIFERENTE
        ==============================================
        */

        if (userIdSalvo !== idUsuario) {
            return res.json({
                valido: false,
                mensagem: 'Esta key pertence a outro usuário.'
            });
        }

        /*
        ==============================================
        DONO CORRETO
        ==============================================

        Agora sim a Key é consumida.

        usada:
        false → true

        O user_id NÃO é alterado.
        */

        const { data: atualizado, error: updateError } = await supabase
            .from('keys_sistema')
            .update({
                usada: true
            })
            .eq('id', data.id)
            .eq('usada', false)
            .select('id, chave, usada, user_id')
            .maybeSingle();

        if (updateError) {
            console.error('❌ Erro ao consumir Key:', updateError);

            return res.status(500).json({
                valido: false,
                mensagem: 'Não foi possível consumir a Key.'
            });
        }

        /*
        Se outro processo consumiu a Key exatamente
        antes deste update, não liberamos.
        */

        if (!atualizado) {
            return res.json({
                valido: false,
                mensagem: 'Esta key já foi utilizada.'
            });
        }

        return res.json({
            valido: true,
            mensagem: 'Key validada e consumida com sucesso!',
            key: atualizado.chave,
            userid: idUsuario,
            usada: true
        });

    } catch (err) {
        console.error('❌ Erro interno:', err);

        return res.status(500).json({
            valido: false,
            mensagem: 'Erro interno no servidor.'
        });
    }
});

module.exports = app;

// Desenvolvimento local
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(`✅ Servidor rodando na porta ${PORT}`);
    });
}
