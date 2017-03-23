var mongoose = require('mongoose');

var EventSchema = new mongoose.Schema({
    eventType : String,
    eventId : Number,
    userId : Number,
  	eventDate: Date
});

var UserSchema = new mongoose.Schema({
    userId : Number,
    userName : String,
    userPoints : Number,
    lastMilestone : Number,
    userAdmin : Boolean
});

var JobSchema = new mongoose.Schema({
    jobId : Number,
    jobTitle : String,
    jobPoints : Number
});

mongoose.model('events', EventSchema);
mongoose.model('users', UserSchema);
mongoose.model('jobs', JobSchema);