const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(express.json());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
    );

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});

const SUPABASE_URL =
    "https://yqxtabfebukvqexvaejs.supabase.co";

const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
    console.error("SUPABASE_KEY não configurada.");
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

/*
========================================
API STATUS
========================================
*/

app.get("/", (req, res) => {
    res.json({
        status: "API Online!",
        mensagem: "Servidor rodando perfeitamente."
    });
});

/*
========================================
VALIDAR KEY
========================================

1. ?key=XXXX
   Apenas verifica se a Key existe.

2. ?key=XXXX&discord=Nome
   Verifica se o Discord corresponde à Key.

IMPORTANTE:
- NÃO altera "usada"
- NÃO consome a Key
- A Key pode ser validada novamente
- O vínculo fica salvo no Supabase
*/

async function validarKey(key, discord) {
    if (!key) {
        return {
            valido: false,
            valida: false,
            success: false,
            mensagem: "Digite uma Key."
        };
    }

    const chave = String(key)
        .trim()
        .toUpperCase();

    const { data, error } = await supabase
        .from("keys_sistema")
        .select("id, chave, usada, user_id")
        .eq("chave", chave)
        .maybeSingle();

    if (error) {
        console.error("Erro Supabase:", error);

        return {
            valido: false,
            valida: false,
            success: false,
            mensagem: "Erro ao consultar o sistema."
        };
    }

    if (!data) {
        return {
            valido: false,
            valida: false,
            success: false,
            key_existe: false,
            mensagem: "Key não encontrada."
        };
    }

    /*
    ========================================
    KEY EXISTE
    ========================================
    */

    if (!discord) {
        return {
            valido: false,
            valida: false,
            success: false,

            key_existe: true,

            pedir_discord: true,

            mensagem:
                "Key encontrada. Informe seu nome do Discord."
        };
    }

    /*
    ========================================
    KEY AINDA NÃO VINCULADA
    ========================================
    */

    if (!data.user_id) {
        return {
            valido: false,
            valida: false,
            success: false,

            key_existe: true,

            mensagem:
                "Esta Key ainda não foi vinculada no Discord."
        };
    }

    /*
    ========================================
    FORMATO DO user_id

    NomeDiscord | IDCliente | DiscordID
    ========================================
    */

    const partes = String(data.user_id)
        .split("|")
        .map((x) => x.trim());

    const nomeDiscordSalvo = partes[0];

    if (!nomeDiscordSalvo) {
        return {
            valido: false,
            valida: false,
            success: false,

            key_existe: true,

            mensagem:
                "Vínculo da Key inválido."
        };
    }

    /*
    ========================================
    COMPARAR DISCORD
    ========================================
    */

    const discordInformado = String(discord)
        .trim()
        .toLowerCase();

    const discordSalvo = String(nomeDiscordSalvo)
        .trim()
        .toLowerCase();

    if (discordInformado !== discordSalvo) {
        return {
            valido: false,
            valida: false,
            success: false,

            key_existe: true,

            discord_correto: false,

            mensagem:
                "O nome do Discord não corresponde a esta Key."
        };
    }

    /*
    ========================================
    AUTORIZADO

    NÃO ALTERA usada
    ========================================
    */

    return {
        valido: true,
        valida: true,
        success: true,

        key_existe: true,
        discord_correto: true,

        mensagem:
            "Key validada com sucesso!",

        key: data.chave,

        discord: nomeDiscordSalvo,

        usada: data.usada
    };
}

/*
========================================
GET /api/validar
========================================
*/

app.get("/api/validar", async (req, res) => {
    try {
        const key = req.query.key;
        const discord = req.query.discord;

        const resultado = await validarKey(
            key,
            discord
        );

        return res.json(resultado);

    } catch (error) {
        console.error(
            "Erro interno:",
            error
        );

        return res.status(500).json({
            valido: false,
            valida: false,
            success: false,
            mensagem:
                "Erro interno no servidor."
        });
    }
});

/*
========================================
POST /api/validar
========================================
*/

app.post("/api/validar", async (req, res) => {
    try {
        const key = req.body?.key;
        const discord = req.body?.discord;

        const resultado = await validarKey(
            key,
            discord
        );

        return res.json(resultado);

    } catch (error) {
        console.error(
            "Erro interno:",
            error
        );

        return res.status(500).json({
            valido: false,
            valida: false,
            success: false,
            mensagem:
                "Erro interno no servidor."
        });
    }
});

/*
========================================
START LOCAL
========================================
*/

if (process.env.NODE_ENV !== "production") {
    const PORT =
        process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(
            `Servidor rodando na porta ${PORT}`
        );
    });
}

module.exports = app;
