let mongoose=require("mongoose"),userSchema=new mongoose.Schema({username:{type:String,required:!0,unique:!0},password:{type:String,required:!0},email:{type:String,required:!0,unique:!0},allowedIP:{type:String,default:null},loggedInFrom:{type:String,default:null}}),User=mongoose.model("User",userSchema);module.exports=User;