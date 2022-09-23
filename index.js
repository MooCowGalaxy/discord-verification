const { Client, EmbedBuilder, GatewayIntentBits } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const { v4: generateToken } = require('uuid');
const nodemailer = require('nodemailer');
const re2 = require('re2');
const config = require('./config');

const client = new Client({ intents: [GatewayIntentBits.GuildMembers] });
client.ready = false;

const prisma = new PrismaClient();
const transporter = nodemailer.createTransport(config.mail);

// last resort error handling
process.on('unhandledRejection', reason => {
    console.error(`Unhandled rejection: ${reason}`);
    console.error(reason.stack);
});

function isEmailValid(email) {
    // use re2 package for protection against reDOS
    const regex = new re2(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);

    return regex.test(email);
}
async function invalidCommand(interaction, message) {
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0xee0000)
                .setTitle('Failed to verify')
                .setDescription(message)
                .setTimestamp()
                .setFooter({ text: config.botName })
        ], ephemeral: true
    });
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) {
        console.error(`Guild was not found.`);
        process.exit(1);
    }
    await guild.members.fetch();
    console.log(`Fetched all guild members.`);
    client.ready = true;
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    switch (interaction.commandName) {
        case "verify":
            const email = interaction.options.getString('email');
            const fullName = interaction.options.getString('fullname');

            if (!isEmailValid(email)) {
                return await invalidCommand(interaction, 'Email is not valid.');
            }
            if (fullName.length < 3) {
                return await invalidCommand(interaction, 'Full name length must be at least 3 characters.');
            }

            const previousUser = await prisma.user.findUnique({
                where: {
                    discordId: interaction.user.id
                }
            });
            if (previousUser && previousUser.verified === 1) {
                return await invalidCommand(interaction, 'You are already verified!');
            }

            const token = generateToken();
            await prisma.user.upsert({
                where: {
                    discordId: interaction.user.id
                },
                update: {
                    email,
                    fullName,
                    verifyCode: token
                },
                create: {
                    email,
                    fullName,
                    discordId: interaction.user.id,
                    verifyCode: token,
                    verified: 0
                }
            });

            const emailInfo = {
                from: `"${config.mailName}" <${config.mail.auth.user}>`,
                to: email,
                subject: `Discord Verification`,
                text: config.mailContent.replaceAll('[link]', `https://${config.domain}/verify/${token}`),
                html: config.mailContent.replaceAll('[link]', `<a href="https://${config.domain}/verify/${token}">Click Here</a>`).replaceAll('\n', '<br>')
            };
            try {
                await transporter.sendMail(emailInfo);
            } catch (e) {
                console.error(e);
                return await invalidCommand(interaction, 'Email failed to send - please try again in a few minutes.');
            }
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x00ee00)
                        .setTitle('Success!')
                        .setDescription(`An email was sent to you containing a verification link.\n\n__Note:__ You may need to check your junk mail.`)
                        .setTimestamp()
                        .setFooter({ text: config.botName })
                ],
                ephemeral: true
            });
            break;
    }
});

const app = require('./web')(client);

app.listen(config.port, () => {
    console.log(`App listening at localhost:${config.port}!`);
})

client.login(config.token).then();
