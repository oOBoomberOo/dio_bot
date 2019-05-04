const discord = require('discord.js');
const writeFile = require('write');
const fs = require('fs');
const promisify = require('promisify');
const fetch = require('node-fetch');
const auth = require('./auth.json');
const response_list_url = 'https://raw.githubusercontent.com/oOBoomberOo/dio_bot/master/response_list.json';

var responseList = [];
var specialResponseList = [];
var errorList = [];

let logs = [];
let max_logs = 5000;
let schedule_backup_time = 12 * 60 * 60 * 1000;
let bot = new discord.Client();

async function getResponse() {
	let promise = await fetch(response_list_url).then(response => response.json());
	responseList = promise['values'];
	specialResponseList = promise['special'];
	errorList = promise['errors'];
}

bot.login(auth.token)

bot.on('ready', () => {
	getResponse();
	logging(`Bot logged in as ${bot.user.username}<${bot.user.id}>`);
	schedule_backup(logs);
});

bot.on('message', message => {
	let author = message.author;
	let channel = message.channel;
	let content = message.content;
	let dio_regex = /(?!`+.*)dio[!?](?!.*`+)/gi;
	let cmd_regex = /!dio/i;
	
	if (content.search(dio_regex) >= 0 && !author.bot) {
		callDio(message);
	}
	else if (content.search(cmd_regex) === 0 && !author.bot && content.split(' ').length > 1) {
		cmdDio(message);
	}

	if (logs.length > max_logs) {
		console.log('Log reach limit write current log to /logs/');
		backup(logs);
	}

});

bot.on('error', error => {
	logging(`${error.message}: ${error.error}`);
})

process.on('cleanup', () => {
	exit_with_backup(logs);
});

process.on('SIGINT', () => {
	console.info('Ctrl-C...');
	process.emit('cleanup');
});

process.on('uncaughtException', event => {
	console.info('Uncaught Exception...');
	console.log(event.stack);
	process.emit('cleanup');
	process.exit(99);
});

// * schedule a backup
function schedule_backup() {
	console.info(`Begin schedule backup...`);
	backup(logs);
	console.info(`Will backup again in ${schedule_backup_time}ms or ${schedule_backup_time/(1000*60)} minutes`);
	setTimeout(() => {
		schedule_backup();
	}, schedule_backup_time);
}

// * perform backup and clear logs
async function backup(logs) {
	console.info('Backup in process...');
	let log_content;
	try {
		log_content = logs.join('\n');
	} catch (error) {
		log_content = '';
		logging(`${error.message}: ${error.error}`);
	}
	let {d, mn, h, m, s} = getCurrentTime();
	let {day, month, year} = getCurrentDate();
	await writeFile(`./logs/${year}_${month}_${day}-${h}_${m}.log`, log_content).catch(error => logging(`${error.message}: ${error.error}`));
	logs = [];
	console.log('Backup completed');
	return true;
}

async function exit_with_backup(logs) {
	await backup(logs);
	process.exit(0);
}

// * log message
function logging(message) {
	let {d, mn, h, m, s} = getCurrentTime();
	let log_message = `${d}/${mn} [${h}:${m}:${s}]: ${message}`;
	console.log(log_message);
	logs.push(log_message);
}


// * Handle dio! command
function callDio(message) {
	let author = message.author;
	let channel = message.channel;
	let attachment = channel.type === 'dm' ? 'DM': `${message.guild.name}`;

	logging(`${author.tag}<${attachment}> execute dio! command`);
	let index = Math.floor(Math.random() * responseList.length);
	let mResponse = responseList[index];
	mResponse = formatMessage(mResponse, '', message);
	sendMessage(channel, mResponse);
}


// * Handle !dio command
async function cmdDio(message) {
	let author = message.author;
	let channel = message.channel;
	let content = message.content;

	let attachment = channel.type === 'dm' ? 'DM': `${message.guild.name}`;
	let cmd = content.substring(content.search(/ /) + 1);
	let mResponse = {message: '', file: ''};
	logging(`${author.tag}<${attachment}> execute !dio ${cmd} command`);
	
	// Regex testing
	switch(true) {
		case /\d+/g.test(cmd):
			if (parseInt(cmd) < responseList.length) {
				mResponse = responseList[parseInt(cmd)];
				mResponse = formatMessage(mResponse, cmd, message);
			}
			else {
				mResponse = {message: errorList['invalid-command'].message};
				mResponse = formatMessage(mResponse, cmd, message);
				logging(`${author.tag}<${attachment}> execute invalid command -> !dio ${cmd}`);
			}
			break;
		case /restart/.test(cmd):
			mResponse.message = 'Restarting...';
			let data = await fetch(response_list_url).then(response => response.json());
			responseList = data['values'];
			specialResponseList = data['special'];
			errorList = data['error'];
			backup(logs);
			break;
		case cmd in specialResponseList:
			mResponse = specialResponseList[cmd];
			mResponse = formatMessage(mResponse, cmd, message);
			break;
		case /weeb/.test(cmd):
			mResponse = {message: await getRandomReddit('Animemes', 'hot', 25)};
			mResponse = formatMessage(mResponse, cmd, message);
			break;
		default:
			mResponse = errorList['invalid-command'];
			mResponse = formatMessage(mResponse, cmd, message);
			logging(`${author.tag}<${attachment}> execute invalid command -> !dio ${cmd}`);
	}
	sendMessage(channel, mResponse);
}


// * Handle object {message: "foo", file: "bar"} and send them
function sendMessage(channel, message) {
	if (message.file !== '' && message.file !== undefined && message.file !== null) {
		bot.channels.get(channel.id).send(message.message, {file: message.file});
	}
	else if (message.message) {
		bot.channels.get(channel.id).send(message.message);
	}
}

async function getRandomReddit(sub, type, limit) {
	let url = `https://reddit.com`;
	let result = await fetch(`${url}/r/${sub}/${type}.json?limit=${limit}&rawjson=true`).then(response => response.json()).catch(error => {throw error;});
	let posts = result.data.children;
	let post = posts[Math.floor(Math.random() * posts.length)].data.permalink;
	return `${url}${post}`;
}

// * Return current time in format {DD, M, hh, mm, ss}
function getCurrentTime() {
	let date = new Date();
	let hour = date.getHours();
	let minute = date.getMinutes();
	let second = date.getSeconds();
	let day = date.getDate();
	let month = date.getMonth();

	hour = (hour < 10 ? '0': '') + hour;
	minute = (minute < 10 ? '0': '') + minute;
	second = (second < 10 ? '0': '') + second;
	day = (day < 10 ? '0': '') + day;
	
	return {d: day, mn: month, h: hour, m: minute, s: second};
}


// * Return current date in format {YYYY, MM, DD}
function getCurrentDate() {
	let date = new Date();
	let day = date.getDate();
	let month = date.getMonth();
	let year = date.getFullYear();

	day = (day < 10 ? '0': '') + day;
	month = (month < 10 ? '0': '') + month;
	
	return {day: day, month: month, year: year};
}

function formatMessage(content, message, client) {
	let result = content;
	let formatted = content.message;
	formatted = formatted
		.replace('%message%', message)
		.replace('%sender%', client.author.username)
		.replace('%channel%', client.channel)
	result.message = formatted;
	return result;
}