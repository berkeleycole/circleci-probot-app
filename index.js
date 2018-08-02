/**
 * This is the entry point for your Probot App.
 * @param {import('probot').Application} app - Probot's Application class.
 */

var fetch = require("node-fetch");

module.exports = (app) => {

	let number;
	let id;

	// app loaded
	app.log('Yay, the app was loaded!')

	// add comment to newly opened issue
	app.on('issues.opened', async context => {
		app.log("::: HEY, WE GOT SOMETHING :::");
		const issueComment = context.issue({ body: 'Thanks for opening this issue!' })
		app.log(context);
		return context.github.issues.createComment(issueComment)
	})

	// listen for a newly opened pull request
	app.on('pull_request.opened', async context => {
		app.log(":::PULL REQUEST OPENED:::")
	})

	// listen for a newly re-opened pull request
	app.on('pull_request.reopened', async context => {
		app.log(":::PULL REQUEST RE-OPENED:::")
		app.log(context)
		number = context.payload.number
	})



	// listen for an incoming status event
	app.on('status', async context => {
		app.log("payload: ", context.payload.state);
		if(context.payload.state === "failure") {
			app.log(":::BUILD FAILED:::")
			app.log(context)
			id = context.payload.commit.sha
		 	fetch("https://circleci.com/api/v1.1/project/github/berkeleycole/portfolio-test/latest/artifacts?circle-token=1cc94c91b04e237e0d675351ffe8c62d70bf040b&filter=failed", {
				headers: {
					"Accept": "application/json"
				},
			})
			.then((resp) => resp.json())
			.then(json => {
				app.log("RESPONSE!", json);
				app.log(json[0].url);

				fetch(`${json[0].url}`)
					.then(artifact => {
						let j = artifact.json()
						return j
					})
					.then(j => {
						j.testResults.map(function(test, index){
							app.log(":::CHECKING TEST:::")
							app.log(test)
							if(test.status === "failed"){
								app.log(":::FOUND FAILING TEST:::")

								let jestFailMessage = "Oh no! A test failed, this was the error message recieved: \n\n" + test.message

								app.log("jestFailMessage: ", jestFailMessage)

								app.log(context.payload)

								const comment = context.issue({ body: jestFailMessage, comment_id: id, number: number})

								app.log("comment: " + comment)

								app.log(":::CREATING COMMENT:::")

								return context.github.issues.createComment(comment)

							}
					})
				})
			})
		}

	})
}
