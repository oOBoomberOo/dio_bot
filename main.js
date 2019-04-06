const discord = require('discord.js');
const writeFile = require('write');
const getJSON = require('get-json');
const auth = require('./auth.json');
const response_list = 'https://raw.githubusercontent.com/oOBoomberOo/dio_bot/master/response_list.json';
let promise = getJSON(response_list);
let responseList = [];
let errorList = [];
let logs = [];
let max_logs = 5000;
let schedule_backup_time = 12*60*60*1000;
let bot = new discord.Client();

// * Start bot only when promise returned
promise.then(response => {
	responseList = response['values'];
	errorList = response['errors'];
	
	bot.login(auth.token)
	
	bot.on('ready', () => { 
		logging(`Bot logged in as ${bot.user.username}<${bot.user.id}>`);
		schedule_backup(logs);
	});
	
	bot.on('message', message => {
		let author = message.author;
		let channel = message.channel;
		let content = message.content;
		let dio_regex = /(?!.*`)\bdio[!?](?!.*`)/gi;
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
})
.catch(error => {
	logging(`${error.message}: ${error.error}`);
});

process.on('cleanup', () => {
	backup(logs);
});

// Copied from stackoverflow
// do app specific cleaning before exiting
process.on('exit', () => {
	process.emit('cleanup');
});

// catch ctrl+c event and exit normally
process.on('SIGINT', () => {
	console.log('Ctrl-C...');
	process.emit('cleanup');
	process.exit(2);
});

//catch uncaught exceptions, trace, then exit normally
process.on('uncaughtException', event => {
	console.log('Uncaught Exception...');
	console.log(event.stack);
	process.emit('cleanup');
	process.exit(99);
});


// * schedule a backup
async function schedule_backup(logs) {
	console.log(`Begin schedule backup...`);
	await backup(logs);
	console.log(`Will backup again in ${schedule_backup_time}ms or ${schedule_backup_time/(1000*60)} minutes`);
	setTimeout(schedule_backup, schedule_backup_time);
}

// * perform backup and clear logs
function backup(logs) {
	console.log('Backup in process...');
	let log_content = logs.join('\n');
	let {d, mn, h, m, s} = getCurrentTime();
	let {day, month, year} = getCurrentDate();
	writeFile(`./logs/${year}_${month}_${day}-${h}_${m}.log`, log_content)
	.then(() => {
		logs = [];
		console.log('Backup completed...');
	})
	.catch(error => {
		logging(`${error.message}: ${error.error}`);
	});
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
	sendMessage(channel, responseList[index]);
}


// * Handle !dio command
function cmdDio(message) {
	let author = message.author;
	let channel = message.channel;
	let content = message.content;

	let attachment = channel.type === 'dm' ? 'DM': `${message.guild.name}`;
	let cmd = content.substring(content.search(/ /) + 1);
	let mResponse = {message: '', file: ''};
	logging(`${author.tag}<${attachment}> execute !dio ${cmd} command`);
	
	// Regex testing
	switch(true) {
		case /\d/g.test(cmd):
			if (parseInt(cmd) < responseList.length) {
				mResponse = responseList[parseInt(cmd)];
			}
			else {
				mResponse = {message: errorList['invalid-command'].message.replace('%s', cmd)};
				logging(`${author.tag}<${attachment}> execute invalid command -> !dio ${cmd}`);
			}
			break;
		case /restart/.test(cmd):
			mResponse.message = 'Restarting...';
			getJSON(response_list)
			.then(response => {
				responseList = response['values'];
				errorList = response['errors'];
				backup(logs);
				return response;
			})
			.catch(error => {
				console.log(error);
			});
			break;
		default:
			mResponse = {message: errorList['invalid-command'].message.replace('%s', cmd)};
			logging(`${author.tag}<${attachment}> execute invalid command -> !dio ${cmd}`);
	}
	sendMessage(channel, mResponse);
}


// * Handle object {message: "foo", file: "bar"} and send them
function sendMessage(channel, message) {
	if (message.file !== '' || message.file != undefined || message.file != null) {
		bot.channels.get(channel.id).send(message.message, {file: message.file});
	}
	else {
		bot.channels.get(channel.id).send(message.message);
	}
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