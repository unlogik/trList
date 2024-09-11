// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const https = require('https');
const YAML = require('yaml');
const fs = require('fs');
const dotenv = require('dotenv')
//const axios = require('axios');

//import axios from "axios";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "sapadt" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('sapadt.trlist', ()=> {
		// The code you place here will be executed every time your command is executed	
		var callback = function(response) {
			console.log("SAP:TR List => run");
			var str = '';
		
			//another chunk of data has been received, so append it to `str`
			response.on('data', function (chunk) {
				str += chunk;
			});
		
			//the whole response has been received, so we just print it out here
			response.on('end', function () {
				var parseString = require('xml2js').parseString;
				var aTR = [];
				parseString(str, function (err, result) {
					aTR = result["tm:root"]["tm:workbench"][0]["tm:modifiable"][0]["tm:request"];
    				console.dir(result);
				});
				var aList = aTR.map(tr=> tr.$["tm:number"] + ' - ' + tr.$["tm:desc"]);
				vscode.window.showQuickPick(aList).then(selection=>{
					vscode.window.showInformationMessage(selection);
					deployer.configuration.ui5.transportNo = selection.match(/^[^\s]*/)[0];
					fs.writeFileSync(vRoot+'/ui5__.yaml', YAML.stringify(ui5) );
				});
				//vscode.window.showInformationMessage(aTR);
			});
		}
	
		var aFolders = vscode.workspace.workspaceFolders;
		if (aFolders){
			var vRoot = aFolders[0].uri.path;
		}
		const file = fs.readFileSync(vRoot+'/ui5.yaml', 'utf8')
		var ui5 = YAML.parse(file);
		var deployer = ui5.builder.customTasks.find(element=>{
			return element.name === 'ui5-task-nwabap-deployer';
		});
		const envConfig = dotenv.parse(fs.readFileSync(vRoot+'/.env'));

		var pass = Buffer.from(envConfig.UI5_TASK_NWABAP_DEPLOYER__USER + ':' + envConfig.UI5_TASK_NWABAP_DEPLOYER__PASSWORD).toString('base64')
		var url = deployer.configuration.connection.server + 
				  '/sap/bc/adt/cts/transportrequests?requestStatus=D' +
				  '&sap-client=' + deployer.configuration.connection.client;
		var aParts = deployer.configuration.connection.server.split(":"); 
		var options = {
			path: '/sap/bc/adt/cts/transportrequests?requestStatus=D',
			method:  'GET',
			// authentication headers
			headers: {
				'Authorization': 'Basic ' + pass,
				'Accept': '*/*'
			 }  
		};
		options.port = aParts[2];
		options.host = aParts[1].substring(2);
		const req = https.request(options, callback);

		req.on('error', (e) => {
			console.error(e);
			vscode.window.showErrorMessage(e.message);
		  });
		req.end();

	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
