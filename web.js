const express = require('express');
const { PrismaClient } = require('@prisma/client');
const ejs = require('ejs');
const config = require('./config');

function renderFile(filename, data = {}) {
    return new Promise((resolve, reject) => {
        filename = `views/${filename}.ejs`
        ejs.renderFile(filename, data, {}, function (err, str) {
            if (err) { reject(err); return }
            resolve(str)
        })
    })
}

const prisma = new PrismaClient();

module.exports = function (discordClient) {
    const app = express();

    app.get('/verify/:token', async (req, res) => {
        if (!discordClient.ready) {
            res.send(await renderFile('template', {text: 'Starting up bot... please reload the page in a few seconds'}));
            return;
        }

        const token = req.params.token;

        const result = await prisma.user.findUnique({
            where: {
                verifyCode: token
            }
        });
        if (!result) {
            res.send(await renderFile('template', {text: 'Sorry, the URL is invalid. Please check the link and try again.'}));
            return;
        }
        if (result.verified === 1) {
            res.send(await renderFile('template', {text: 'You are already verified.'}));
            return;
        }

        const guild = discordClient.guilds.cache.get(config.guildId);
        const verifiedRole = await guild.roles.fetch(config.verifiedRole);
        const studentRole = await guild.roles.fetch(config.studentRole);

        try {
            const member = await guild.members.fetch(result.discordId);
            try {
                await member.roles.add(verifiedRole);
                if (result.email.endsWith(`@${config.studentRoleDomain}`)) {
                    await member.roles.add(studentRole);
                }
            } catch (e) {
                console.error(e);
                console.error(`Unable to process roles for user ${member.id}`);
            }
        } catch (e) {
            console.warn(`Member ${result.discordId} was not in cache.`);
        }

        await prisma.user.update({
            where: {
                verifyCode: token
            },
            data: {
                verified: 1,
                verifiedTimestamp: Date.now().toString()
            }
        });

        res.send(await renderFile('template', {text: 'You have successfully verified your Discord account! It may take a bit for your roles to update.'}));
    });

    return app;
}