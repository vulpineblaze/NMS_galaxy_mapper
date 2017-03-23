var express = require('express'),
	router = express.Router(),
	mongoose = require('mongoose'),
    Sugar = require('sugar'),
	_ = require('underscore');

var	Event = mongoose.model('events'),
	Job = mongoose.model('jobs'),
	User = mongoose.model('users');


// Define user milestones
var userStarMilestones = [0, 10, 20, 50, 100, 150, 200, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000, 10000];






/* GET home page. */
router.get('/', function(req, res, next) {

	var pageData = {};

	// Get user data from db
	User.find(function(err, users){

		pageData.users = users;

		// Render page
	    res.render('index', pageData);

  	});

});


/* GET user job list page. */
router.get('/user-:userId/job-list', function(req, res, next) {

	var pageData = {};
	var userId = parseInt(req.params.userId);

	// Get user data from db
	User.findOne({userId: userId}).exec()

  	.then(function(user){

  		// Add user to page data
	  	pageData.user = user;

		// Get jobs from db
		Job.find(function(err, jobs){

			// Add jobs to page data
			pageData.jobs = jobs;

			// Render page
			res.render('job-list', pageData);
		    
	  	});

  	});

});






/* GET user page. */
router.get('/user-:userId', function(req, res, next) {

	var pageData = {};

	pageData.currentUserId = parseInt(req.params.userId);

	// Get job data from db
	Job.find(function(err, jobs){
		pageData.jobs = jobs;	    
  	}).exec()

  	// Then get event data from db
  	.then(function(jobs){

		Event.find(function(err, events){
			pageData.events = events;	    
	  	})
	  		.sort('-eventDate')
	  		.exec()

	 })

	// Then get user data from db
  	.then(function(events){

		User.find(function(err, users){

			pageData.users = users;

			// For each user in users
			_.each(users, function(user, key) {

				var userId = parseInt(user.userId);

				// Get job events for that user
				var userJobEvents = _.where(pageData.events, {userId: user.userId, eventType : "job"});

				// Get job events for that user for this week
				var userJobEventsThisWeek = _.filter(userJobEvents, function(event){
					return event.eventDate > Sugar.Date.beginningOfISOWeek(new Date());
				});

				// Total points for that user
				var userPoints = sumPoints(userJobEvents, pageData.jobs);

				// Total points for that user this week
				var userPointsThisWeek = sumPoints(userJobEventsThisWeek, pageData.jobs);

				console.log("Total points: " + userPoints);
				console.log("Weekly points: " + userPointsThisWeek);

				// Add user points to page data
				user = _.findWhere(pageData.users, {userId: userId});
				user.userPoints = userPoints;
				user.userPointsThisWeek = userPointsThisWeek;


			});

	    	res.render('user', pageData);

	  	})

  	})

});


/* GET add job page. */
router.get('/user-:userId/job-:jobId', function(req, res, next) {

  	var pageData = {};
  	var userId = parseInt(req.params.userId);

  	// Get user data from db
	User.findOne({userId: userId}).exec()

	.then(function(user){

		pageData.user = user;

		// Get job data from db
		Job.find(function(err, jobs){
	  		var jobId = parseInt(req.params.jobId);
			var job = _.find(jobs, {jobId: jobId})
			pageData.job = job;

			// Render page
			res.render('job-add', pageData);
		    
	  	});

  	});

});


/* POST add job. */
router.post('/add-job', function(req, res) {

    var userId = req.body.userId;

    // Add the job event to the db
   	Event.create({
		eventType : "job",
    	userId : userId,
    	eventId : req.body.jobId,
    	eventDate : req.body.jobDate   
    })

   	// Then...
   	.then(function(){
   		
   		// Get the user data from the db
		return User.findOne({userId : userId})

   	})

  	// Then...
  	.then(function(user){

  		// Get job event data from db
	    Event.find({userId: userId, eventType : "job"}, function(err, events) {

	    	// Get job data from db
	    	Job.find(function(err, jobs){

		    	// Get the total points for that user
				var userPoints = sumPoints(events, jobs);

				// Find current milestone
				var milestone = nearestLowerNumber(userPoints, userStarMilestones)

				//console.log("Points: " + userPoints)
				//console.log("Last milestone: " + user.lastMilestone)
				//console.log("Current milestone: " + milestone)

				// If the current milestone is bigger than the last one
				if (milestone - 1 > user.lastMilestone - 1){

					// Update the last one to the current one
					User.findOneAndUpdate(
						{ userId : userId }, 
						{ $set: {"lastMilestone" : milestone} }
					)

			    	// Add a milestone event to the db
					.then(function(){
					   	return Event.create({
							eventType : "milestone",
					    	userId : userId,
					    	eventId : milestone,
					    	eventDate : new Date()   
					    })				
					})

					.then(res.redirect('/user-' + userId + '/milestone-' + milestone))

				} else {

					res.redirect('/user-' + userId)

				}

	    	})

	    })

	})

	

});

/* GET milestone congrats page. */
router.get('/user-:userId/milestone-:milestone', function(req, res, next) {

	var pageData = {};
	pageData.userId = parseInt(req.params.userId);
	pageData.milestone = parseInt(req.params.milestone);

	res.render('milestone', pageData);

});


/* GET admin page. */
router.get('/admin', function(req, res, next) {

  	var pageData = {};

	// Get job data from db
	Job.find(function(err, jobs){
		pageData.jobs = jobs;	    
  	}).exec()

  	// Then get event data from db
  	.then(function(jobs){

		Event.find(function(err, events){
			pageData.events = events;	    
	  	}).exec()

	 })

	// Then get user data from db
  	.then(function(events){

		User.find(function(err, users){
			pageData.users = users;
	    	res.render('admin', pageData);
	  	})

  	})

});


/* Delete an event */
router.get('/delete/event-:eventId', function(req, res, next) {

	Event.findByIdAndRemove(req.params.eventId, function (err) {
	    res.redirect('/admin');
	});

});


/* Delete all events */
router.get('/delete/all', function(req, res, next) {

	// Remove all events
	Event.remove({}, function (err) {
		if (err) return res.send(500, { error: err });
	    res.redirect('/admin');
	});

});


/* Load defaults */
router.get('/load-defaults', function(req, res, next) {

	// Load default data
	var	defaultData = require('../data/defaults.json');

	// Delete users from db
	User.remove({}).exec()

	// Create users from data.json
	.then(function(user){
		User.create(defaultData.users, function (err) {
		    if (err) return res.send(500, { error: err });
		});
	});

	// Delete jobs from db
	Job.remove({}).exec()

	// Create jobs from data.json
	.then(function(job){
		Job.create(defaultData.jobs, function (err) {
		    if (err) return res.send(500, { error: err });
	    	res.redirect('/');
		});
	});

});



// =============== FUNCTIONS =============== //



function nearestLowerNumber(target, array){

	// Return the number in an array that's closest to, 
	// but lower than a target number. Used for figuring 
	// out what your last milestone was.

	var sortedArray = _.sortBy(array, function(num) {
    	return -num;
	}); 

	var result = _.find(sortedArray, function(num){ 
		return num <= target; 
	});

	return result;

}


function sumPoints(events, jobs){
	
	// Returns the total stars earned from an array of events

	// For each event in the array
	var points = _.reduce(events, function(num, event){

		// Find the star value associated with that event
		var jobPoints = _.find(jobs, {jobId: parseInt(event.eventId)}).jobPoints

		// Add it to the running total
		return jobPoints + num;

	}, 0);

	return points;
}


module.exports = router;
