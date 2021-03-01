require('dotenv/config');
const express = require("express");
const router       = express.Router();
const passport     = require("passport");
const Student      = require("../models/student");
const Organisation = require("../models/organisation");
const nodemailer = require('nodemailer');
const moment = require('moment');

const Exam = require("../models/exam");

router.get('/exam/new/:id', (req,res)=>{
    Organisation.findById(req.params.id, (err, foundOrganisation) => {
        console.log(foundOrganisation);
        res.render("exam",{id: req.params.id, user: foundOrganisation});
    });
});

router.post('/exam/new/:id', (req, res) => {
    var startTime = moment(req.body.startTime, "H:mm");
    var endTime = moment(req.body.endTime, "H:mm");
    var duration = moment.duration(endTime.diff(startTime));
    var hours = parseInt(duration.asHours());
    var minutes = parseInt(duration.asMinutes()) % 60;
    var isPublic = false;
    if (req.body.isPrivate == "on")
        isPublic = false;
    else
        isPublic = true;
    var newExam = new Exam({
        name: req.body.name,
        description: req.body.description,
        link: req.body.link,
        date: req.body.date,
        medium: req.body.medium,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        duration: hours + " hours " + minutes + " minutes",
        isPublic: isPublic,
        organizer: req.body.Name
    });

    Exam.create(newExam, (err,newlyCreated)=>{
        if(err){
            return res.redirect("back");
        }else{
            Organisation.findById(req.params.id, (err, foundOrganisation) => {
                if (err) {
                    return res.redirect("back");
                }
                else {
                    foundOrganisation.exams_conducted.push(newlyCreated._id);
                    foundOrganisation.save((err)=>{
                        return res.redirect("/organisation-home/" + req.params.id );
                    });
                }
            })
        }
    })

});


router.get("/student-home/:id", (req, res) => {
    console.log("in student-home/:id route:")
    console.log(req.user._id);
    var foundExam;
    Exam.find({}, (err, foundExams) => {
        if (err)
            return res.redirect("back");
        foundExam = foundExams;
    });

    Student.findById(req.params.id).populate({
        path: "organisations",
        populate: {
            path: "exams_conducted"
        }
    }).exec((err, foundStudent) => { 
        if (err)
            return res.redirect("back");
        res.render("studentHome", { exams: foundExam, student: foundStudent });
    });
});

router.get("/organisation-home/:id", async (req, res) => {
    Organisation.findById(req.params.id).populate("exams_conducted").exec((err, foundOrganisation) => {
        if (err) {
            return res.redirect("back");
        }
        var array = foundOrganisation.exams_conducted;
        // console.log(foundOrganisation);
        res.render("organisationHome", { array: array, user: foundOrganisation });
    });
});
                
router.post("/subscribe/:clicked_exam_id", (req, res) => {
    Exam.findById(req.params.clicked_exam_id, async (err,foundExam)=>{
        if(err){
            console.log(err);
            res.redirect("back");
        } else {
            var transporter = nodemailer.createTransport({
                service: "Gmail",
                auth: {
                    user: "parthshah1936@gmail.com",
                    pass: process.env.password,
                },
            });
            await transporter.sendMail({
                from: "smartexamportal@gmail.com",
                to: req.user.email,
                subject: "Subscribed to exam",
                text:  "You have successfully subscribed to exam!"
            });
            transporter.close();

            req.user.exams.push(foundExam);
            foundExam.students_registered.push(req.user._id);
            req.user.save();
            foundExam.save();
            // console.log(req.user.exams);
            // console.log(foundExam.students_registered);
            res.redirect("/student-home/" + req.user._id );
        }   
    });
});

router.get("/exam/:id/:student_id", function (req, res) {
    console.log(req.path);
    console.log(req.query);
    Exam.findById(req.params.id,(err,foundExam)=>{
        if(err){
            console.log(err);
        } else {
            // console.log(foundExam);
            res.render("viewExam", { exam: foundExam , id: req.params.student_id});
        }
    })
});

router.get("/:student_id/myExams",(req,res)=>{
    Student.findById(req.params.student_id).populate("exams").exec((err,foundStudent)=>{
        if(err){
            console.error(err);
            res.redirect("back");
        }else{
            res.render("myExams", { exams: foundStudent.exams, user: req.user });
        }
    })
});

module.exports = router;