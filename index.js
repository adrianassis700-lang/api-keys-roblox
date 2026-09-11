const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(express.json());

// CORS
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

// SUPABASE
const supabaseUrl =
    "https://yqxtabfebukvqexvaejs.supabase.co";

const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
    console.error("❌ SUPABASE_KEY não configurada.");
    process.exit(1);
}

const supabase = createClient(
    supabaseUrl,
    supabaseKey
);

// STATUS
app.get("/", (req, res) => {
    res.json({
        status: "API Online!",
        mensagem: "Servidor rodando perfeitamente."
    });
});

// =====================================================
// VALIDAR KEY
// Fluxo:
// 1. Confirma que a Key existe
// 2. Confirma o Nome do Discord dentro de user_id
// 3. Se tudo estiver correto, consome a Key
// =====================================================

app.get("/api/validar", async (req, res) => {
    try {
        const key = req.query.key;
        const discord = req.query.discord;

        if (!key) {
            return res.json({
                valido: false,
                valida: false,
                success: false,
                mensagem: "Digite uma Key."
            });
        }

        const chaveLimpa = String(key)
            .trim()
            .toUpperCase();

        // Procura a Key
        const { data, error } = await supabase
            .from("keys_sistema")
            .select("id, chave, usada, user_id")
            .ilike("chave", chaveLimpa)
            .maybeSingle();

        if (error) {
            console.error(
                "❌ Erro ao consultar Supabase:",
                error
            );

            return res.status(500).json({
                valido: false,
                valida: false,
                success: false,
                mensagem: "Erro ao consultar o sistema."
            });
        }

        // Key não existe
        if (!data) {
            return res.json({
                valido: false,
                valida: false,
                success: false,
                key_existe: false,
                mensagem: "Key não encontrada."
            });
        }

        // Key existe
        if (data.usada === true) {
            return res.json({
                valido: false,
                valida: false,
                success: false,
                key_existe: true,
                mensagem: "Esta Key já foi utilizada."
            });
        }

        // Se ainda não foi informado o Discord,
        // apenas confirma que a Key existe.
        if (!discord) {
            return res.json({
                valido: false,
                valida: false,
                success: false,
                key_existe: true,
                pedir_discord: true,
                mensagem: "Key encontrada. Informe seu nome do Discord."
            });
        }

        if (!data.user_id) {
            return res.json({
                valido: false,
                valida: false,
                success: false,
                key_existe: true,
                mensagem:
                    "Esta Key ainda não foi vinculada no Discord."
            });
        }

        // Formato:
        // NomeDiscord | IDCliente | DiscordID
        const partes = String(data.user_id)
            .split("|")
            .map(part => part.trim());

        if (partes.length < 1) {
            return res.status(500).json({
                valido: false,
                valida: false,
                success: false,
                mensagem: "Vínculo da Key inválido."
            });
        }

        const nomeDiscordSalvo = partes[0];

        const nomeInformado = String(discord)
            .trim()
            .toLowerCase();

        const nomeSalvo = String(nomeDiscordSalvo)
            .trim()
            .toLowerCase();

        // Verifica o nome do Discord
        if (nomeInformado !== nomeSalvo) {
            return res.json({
                valido: false,
                valida: false,
                success: false,
                key_existe: true,
                discord_correto: false,
                mensagem:
                    "O nome do Discord não corresponde a esta Key."
            });
        }

        // Consome a Key SOMENTE depois de confirmar tudo
        const {
            data: atualizado,
            error: updateError
        } = await supabase
            .from("keys_sistema")
            .update({
                usada: true
            })
            .eq("id", data.id)
            .eq("usada", false)
            .select("id, chave, usada, user_id")
            .maybeSingle();

        if (updateError) {
            console.error(
                "❌ Erro ao consumir Key:",
                updateError
            );

            return res.status(500).json({
                valido: false,
                valida: false,
                success: false,
                mensagem: "Não foi possível consumir a Key."
            });
        }

        // Impede duas validações simultâneas
        if (!atualizado) {
            return res.json({
                valido: false,
                valida: false,
                success: false,
                mensagem: "Esta Key já foi utilizada."
            });
        }

        // SUCESSO
        return res.json({
            valido: true,
            valida: true,
            success: true,
            key_existe: true,
            discord_correto: true,
            mensagem: "Key validada com sucesso!",
            key: atualizado.chave,
            discord: nomeDiscordSalvo,
            usada: true
        });

    } catch (err) {
        console.error("❌ Erro interno:", err);

        return res.status(500).json({
            valido: false,
            valida: false,
            success: false,
            mensagem: "Erro interno no servidor."
        });
    }
});

// POST também funciona
app.post("/api/validar", async (req, res) => {
    const key = req.body?.key;
    const discord = req.body?.discord;

    req.query.key = key;
    req.query.discord = discord;

    return app.handle(req, res);
});

module.exports = app;

if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(
            `✅ Servidor rodando na porta ${PORT}`
        );
    });
}
