const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const config = require('./config');

// too lazy to make a fully structured command system :troll:
const commands = [
    new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verifies your Discord account.')
        .addStringOption(option =>
            option.setName('email')
                .setDescription('Your email (use your OCSA email if you are an OCSA student)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('fullname')
                .setDescription('Your full name.')
                .setRequired(true))
]

let commandJSON = [];
for (let command of commands) {
    commandJSON.push(command.toJSON());
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
    try {
        console.log(`Started updating application commands.`);

        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commandJSON }
        );

        console.log(`Success!`);
    } catch (e) {
        console.error(`Failed updating application commands:`);
        console.error(e);
    }
})();
