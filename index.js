const {makeConnection} = require("./makeDbConnection")
const Project = require("./projectModel")
const Task = require("./taskModel")
const Team = require("./teamModel")
const SignUp = require("./signUpModel")
const User = require("./ownerModel")
const Tag = require ("./tagsModel")
const mongoose = require('mongoose')
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const JWT_Secret = "workasanaproject"

const express = require("express")
const app = express()

app.use(express.json())

const cors = require("cors")
const corsOptions = {
    origin: "*", 
    credentials: true,
}

app.use(cors(corsOptions))

makeConnection()

async function giveHashPass(key){
    const saltRounds = 10
    return await bcrypt.hash(key, saltRounds)
}

app.post("/allUsers",async (req, res) => {
    try{
        const userInfo = req.body
        const newUserPass = await giveHashPass(userInfo.password)
        const newUser = new SignUp({...userInfo, password: newUserPass})
        const saveUser = await newUser.save()
        if(saveUser){
            res.status(201).json({message: "user added successfully."})
        }    
    }catch(error){
        res.status(500).json({message: error.message})
    }
})


const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided." });
    }

    const token = authHeader.split(" ")[1]

    try{
        const decodedToken = jwt.verify(token, JWT_Secret)
        req.user = decodedToken
        next()
    }catch(error){
        return res.status(401).json({message: "Invalid token."})
    }
}

app.get("/allUsers",verifyJWT, async (req, res) => {
    try{
        const validUsers = await SignUp.find()
        if(validUsers.length !== 0){
            res.status(200).json(validUsers)
        }else{
            res.status(404).json("users not found.")
        }
    }catch(error){
        res.status(500).json({message: error.message})
    }
})

app.post("/admin/login", async (req, res) => {
    const {email} = req.body 
    const {password} = req.body
    const admin = await SignUp.findOne({email: email})
    if(!admin){
        res.status(404).json("not found")
    }else{
        const isMatch = await bcrypt.compare(password, admin.password)
        if(isMatch){ 
            const token = jwt.sign({role: "admin",email: admin.email, name: admin.name}, JWT_Secret, {expiresIn: "24h"})
            res.json({token})
        }else{
            res.status(401).json({message: "Access Denied"})
        }
    }
})

app.get("/verifyUser", verifyJWT, async (req, res) => {
    res.json({email: req.user.email, name: req.user.name})
})

app.post("/projects", verifyJWT, async (req, res) => {
    try{
        const newProject = new Project(req.body)
        const saveProject = await newProject.save()
        if(saveProject){
            res.status(201).json({message: "Project added successfully."})
        }
    }catch(error){
        res.status(500).json({error: error.message})
    }
})

app.get("/projects", verifyJWT, async (req, res) => {
    try{
        const allProjects = await Project.find()
        if(allProjects.length != 0){
            res.status(200).json(allProjects)
        }else{
            res.status(404).json({error: "project not found."})
        }
    }catch(error){
        res.status(500).json({error: error.message})
    }
})

app.delete("/projects/:id", verifyJWT, async (req, res) => {
    try{
        const {id} = req.params
    
        await Task.deleteMany({project: id})
        
        const delProject = await Project.findByIdAndDelete(id)
        if(delProject){
        res.status(201).json({message: "project deleted successfully."})
        }else{
            res.status(404).json({message: "project not found."})
        }   
    }catch(error){
        res.status(500).json({message: error.message})
    }
})

app.post("/tasks", verifyJWT, async (req, res) => {
    try{
        const newTask = new Task(req.body)
        const saveTask = await newTask.save()
        if(saveTask){
            res.status(201).json({message: "task added successfully."})
        }
    }catch(error){
        res.status(500).json({message: error.message})
    }
})

app.post("/tasks/:id", verifyJWT, async (req, res) => {
    try{
        const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, {new: true})
        if(!updatedTask){
            res.status(404).json({message: "task not found."})
        }else{
            res.status(201).json(updatedTask)
        }
    }catch(error){
        res.status(500).json({message: error.message})
    }
})

app.get("/tasks", verifyJWT, async (req, res) => {
    try{
        const allTasks = await Task.find().populate("project").populate("team").populate("tags").populate("owners")
        if(allTasks.length != 0){
            res.status(200).json(allTasks)
        }else{
            res.status(404).json({message: "tasks not found."})
        }
    }catch(error){
        res.status(500).json({message: error.message})
    }
})

app.delete("/tasks/:id", verifyJWT, async (req, res) => {
    try{
        const {id} = req.params
        const delTask = await Task.findByIdAndDelete(id)
        if(delTask){
            res.status(201).json({message: "Task deleted successfully."})
        }else{
            res.status(404).json({message: "Task not found."})
        }
    }catch(error){
        res.status(500).json({message: error.message})
    }
})

app.post("/teams", verifyJWT, async (req, res) => {
    try{
        const newTeam = new Team(req.body)
        const saveTeam = await newTeam.save()
        if(saveTeam){
            res.status(201).json({message: "team added successfully"})
        }
    }catch(error){
        res.status(500).json({message: error.message})
    }
})

app.get("/teams", verifyJWT, async (req, res) => {
    try{
        const allTeams = await Team.find().populate("members")
        if(allTeams.length != 0){
            res.status(200).json(allTeams)
        }else{
            res.status(404).json({message: "teams not found."})
        }
    }catch(error){
        res.status(500).json({message: error.message})
    }
})

app.post("/teams/:id", verifyJWT, async (req, res) => {
    try{
        const team = await Team.findByIdAndUpdate(
            req.params.id,
            {$push: {members: req.body._id}},
            {new: true}
        )

        if(!team){
            res.status(404).json({message: "team not found."})
        }else{
            res.status(201).json({message: "member added successfully."})
        }
    }catch(error){
        res.status(500).json({message: error.message})
    }
})

app.post("/users", verifyJWT, async (req, res) => {
    try{
        let saveUser;     
        if(Array.isArray(req.body)){
            saveUser = await User.insertMany(req.body, {ordered: false})
        }else{
            const newUser = new User(req.body)
            saveUser = await newUser.save()
        }

        if(saveUser){
            res.status(201).json({message: "user added successfully", saveUser})
        }
    }catch(error){
        res.status(500).json({message: error.message})
    }
})

app.get("/users", verifyJWT, async (req, res) => {
    try{
        const allUsers = await User.find()
        if(allUsers.length != 0){
            res.status(200).json(allUsers)
        }else{
            res.status(404).json({message: "users not found."})
        }
    }catch(error){
        res.status(500).json({message: error.message})
    }
})


app.post("/tags", verifyJWT, async (req, res) => {
    try{
        const newTag = new Tag(req.body)
        const saveTag = await newTag.save()
        if(saveTag){
            res.status(201).json({message: "tag saved successfully."})
        }
    }catch(error){
        res.status(500).json({message: error.message})
    }
})

app.get("/tags", verifyJWT, async (req, res) => {
    try{
        const allTags = await Tag.find()
        if(allTags.length != 0){
            res.status(200).json(allTags)
        }else{
            res.status(404).json({message: "tags not found."})
        }
    }catch(error){
        res.status(500).json({message: error.message})
    }
})



app.get("/report/last-week", verifyJWT, async (req, res) => {
    try{
        const completedTasks = await Task.find({status: "Completed"})
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const closedLW = completedTasks.filter(task => (Math.floor((new Date() - new Date(task.updatedAt))/ (1000 * 60 * 60 * 24)) < 7))

        function getDays(){
            const today = new Date();
            const lastWeekDays = [];

            // Start from today and go back 6 days
            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                lastWeekDays.push(daysOfWeek[date.getDay()]);
            }

            return lastWeekDays.reverse(); 
        }

        let weekDays = {}
        if(closedLW.length != 0){ 
            getDays().map(day => {
                weekDays = {...weekDays, [day]: closedLW.reduce((acc, curr) => daysOfWeek[new Date(curr.updatedAt).getDay()] === day ? acc = acc + 1 : acc,0)}
            })
            res.status(200).json(weekDays)
        }else{
            res.status(404).json({message: "tasks not found."})
        }
    }catch(error){
        res.status(500).json({message: error.message})
    }
})

app.get("/report/pending", verifyJWT, async (req, res) => {
    try{
        const allTasks = await Task.find()
        const taskPending = allTasks.filter(task => task.status !== "Completed")
        let pendingWork = {}
        if(taskPending.length !== 0){
            taskPending.map(task => {
                pendingWork = {...pendingWork, [task.name]: task.timeToComplete}
            })

            res.status(200).json(pendingWork)
        }else{
            res.status(404).json({message: "there are no pending tasks"})
        }
    }catch(error){
        res.status(500).json({message: error.message})
    }
})

app.get("/report/closed-tasks/teams", verifyJWT, async (req, res) => {
    try{
        const allTeams = await Team.find()
        const completedTasks = await Task.find({status: "Completed"}).populate("team")

        let tasksClosedByTeam = {}
        if(allTeams.length !== 0){
            allTeams.map(team => {
                tasksClosedByTeam = {...tasksClosedByTeam, [team.name]: completedTasks.reduce((acc, curr) => curr.team.name == team.name ? acc = acc + 1 : acc,0)}
            })
            res.json(tasksClosedByTeam)
        }else{
            res.status(404).json({message: "teams not found"})
        } 
    }catch(error){
        res.status(500).json({message: error.message})
    }
})

app.get("/report/closed-tasks/owners", verifyJWT, async (req, res) => {
    try{
        const allOwners = await User.find()
        const completedTasks = await Task.find({status: "Completed"}).populate("owners")

        let tasksClosedByOwner = {}
        if(allOwners.length !== 0){
            allOwners.map(owner => {
                tasksClosedByOwner= {...tasksClosedByOwner, [owner.name]: completedTasks.reduce((acc, curr) => curr.owners.filter(taskOwner => taskOwner.name === owner.name).length !== 0 ? acc = acc + 1 :acc,0)}
            })
            res.json(tasksClosedByOwner)
        }else{
            res.status(404).json({message: "owners not found"})
        }
    }catch(error){
        res.status(500).json({message: error.message})
    }
})

app.get("/report/closed-tasks/projects", verifyJWT, async (req, res) => {
    try{
        const allProjects = await Project.find()
        const completedTasks = await Task.find({status: "Completed"}).populate("project")

        let tasksClosedByProject = {}
        if(allProjects.length !== 0){
            allProjects.map(project => {
                tasksClosedByProject = {...tasksClosedByProject, [project.name]: completedTasks.reduce((acc, curr) => curr.project && curr.project.name == project.name ? acc = acc + 1 : acc,0)}
            })
            res.json(tasksClosedByProject)
        }else{
            res.status(404).json({message: "projects not found"})
        }
    }catch(error){
        res.status(500).json({message: error.message})
    }
})

PORT = 3000

app.listen(PORT, () => {
    console.log("server is running on port", PORT)
})




