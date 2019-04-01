const discord = require('discord.js');
const auth = require('./auth.json');
const jsonfile = require('jsonfile');
const response_list = './response_list.json';
let responseList = jsonfile.readFileSync(response_list)['values'];

let bot = new discord.Client();
bot.login(auth.token)

bot.on('ready', () => { 
	console.log('Bot logged in as: ' + bot.user.username + '<' + bot.user.id + '>');
});

bot.on('message', message => {
	let author = message.author;
	let channel = message.channel;
	let content = message.content;
	let regex = /dio[!?]/gi;

	if (content.search(regex) >= 0 && !author.bot) {
		let index = Math.floor(Math.random() * responseList.length);
		sendMessage(bot, channel, responseList[index]);
	}
	else if (content.match(/!dio/i) && !author.bot) {
		cmd = content.substring(content.search(/ /) + 1);
		if (parseInt(cmd) !== NaN) {
			let pInt = parseInt(cmd);
			if (pInt < responseList.length) {
				sendMessage(bot, channel, responseList[pInt]);
			}
		}
		else {
			// It won't reach this part of code for some reason.
			switch(cmd) {
				case 'restart':
					console.log('Restarting...');
					sendMessage(bot, channel, {message: 'Restarting...'});
					responseList = jsonfile.readFileSync(response_list)['values'];
					break;
				default:
					console.log(author.username + ' entered invalid command: ' + message.content);
			}
		}
	}
});

function sendMessage(bot, channel, message) {
	if (message.file !== '' || message.file != undefined || message.file != null) {
		bot.channels.get(channel.id).send(message.message, {file: message.file});
	}
	else {
		bot.channels.get(channel.id).send(message.message);
	}
}