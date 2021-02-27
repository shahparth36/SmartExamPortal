const express      = require("express");
const router       = express.Router();
const passport     = require("passport");
const Student      = require("../models/student");
const Organisation = require("../models/organisation");
const nodemailer = require('nodemailer');
const moment = require('moment');

const Exam = require("../models/exam");

router.get('/exam/new', (req,res)=>{
    res.render("exam",{user:req.user});
});

router.post('/exam/new', (req, res) => {
    // console.log(req.user);
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
        organizer: req.user.Name
    });

    Exam.create(newExam, (err,newlyCreated)=>{
        if(err){
            return res.redirect("back");
        }else{
            Organisation.findById(req.user._id, (err, foundOrganisation) => {
                if (err) {
                    return res.redirect("back");
                }
                else {
                    foundOrganisation.exams_conducted.push(newlyCreated._id);
                    foundOrganisation.save((err)=>{
                        return res.redirect("/organisation-home/" + req.user._id);
                    });
                }
            })
        }
    })

});


router.get("/student-home/:id", (req, res) => {
    Exam.find({}, (err, foundExam) => {
        if (err)
            return res.redirect("back");
        
        Student.findById(req.params.id).populate({
            path: "organisations",
            populate: {
                path: "exams_conducted"
            }
        }).exec((err, foundStudent) => {
            if (err)
                return res.redirect("back");
            // console.log(foundExam);
            res.render("studentHome", { exams: foundExam, student: foundStudent });
        });
    });
});

router.get("/organisation-home/:id", async (req, res) => {
    Organisation.findById(req.params.id).populate("exams_conducted").exec((err, foundOrganisation) => {
        if (err) {
            return res.redirect("back");
        }
        var array = foundOrganisation.exams_conducted;
        
        res.render("organisationHome", {array: array, user: foundOrganisation});
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
                    pass: "adgzcbqet19",
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

router.get("/exam/:id",function(req,res){
    Exam.findById(req.params.id,(err,foundExam)=>{
        if(err){
            console.log(err);
        } else {
            // console.log(foundExam);
            res.render("viewExam", { exam: foundExam , user: req.user});
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

// router.get("/exam/:id/edit",(req,res)=>{
 // 
// })

// send mail when subscribed for examination!

// student joins organisation(joining code) (1)
// students subscribes exam (2)
// student gets notfied (2) // smart exam portal sends mail
// display to students public exams + organisation exams (1)
// my subscribed exams (2)
// upcoming live completed (independent but optional)


// student subscribes exam
// student gets notfied
// display to students all exams 
// my subscribed exams


module.exports = router;