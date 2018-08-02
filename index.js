/**
 * This is the entry point for your Probot App.
 * @param {import('probot').Application} app - Probot's Application class.
 */
// include fetch to allow Probot to reach the Circle CI api
var fetch = require("node-fetch");

module.exports = (app) => {

	// Collect some information from the Pull Request in order to leave a comment later
	let number;
	let id;

	// listen for a newly opened pull request and find its number
	app.on('pull_request.opened', async context => {
		app.log(":::PULL REQUEST OPENED:::")
		number = context.payload.number
	})

	// listen for a newly re-opened pull request and find its number
	app.on('pull_request.reopened', async context => {
		app.log(":::PULL REQUEST RE-OPENED:::")
		number = context.payload.number
	})

	// listen for an incoming status event (will be triggered by a PR action)
	app.on('status', async context => {
		// To see what's going on, un-comment the logs:
		// you can log "context.payload" any time
		// app.log("payload: ", context.payload.state);

		// If the status event shows a failure
		if(context.payload.state === "failure") {

			// app.log(":::BUILD FAILED:::")

			// collect the id from the PR commit
			id = context.payload.commit.sha

			// fetch the url of the artifact file generated by a failing Jest test on Circle CI
		 	fetch("https://circleci.com/api/v1.1/project/github/berkeleycole/portfolio-test/latest/artifacts?circle-token=1cc94c91b04e237e0d675351ffe8c62d70bf040b&filter=failed", {
				headers: {
					"Accept": "application/json"
				},
			})
			.then((resp) => resp.json())
			.then(json => {
				// fetch the artifact text file (url is included in the response from Circle CI)
				fetch(`${json[0].url}`)
				.then(artifact => {
					let j = artifact.json()
					return j
				})
				.then(j => {
					// each Jest test has its own results, check each test for a failure
					j.testResults.map((test, index) => {
						// app.log(":::CHECKING TEST:::")

						// if test fails:
						if(test.status === "failed"){
							// app.log(":::FOUND FAILING TEST:::")

							// create body of comment to be added to PR
							let jestFailMessage = "Oh no! A test failed, this was the error message recieved: \n\n" + test.message

							// assemble comment:
							// comment_id is the sha code of the PR commit
							// number is the number of the PR (only recorded in the PR context payload)
							const comment = context.issue({ body: jestFailMessage, comment_id: id, number: number})

							// create the comment
							return context.github.issues.createComment(comment)
						}
					})
				})
			})
		}
	})
}
