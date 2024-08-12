const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt =  require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { type } = require("os");

app.use(express.json());
app.use(cors());

// Database
mongoose.connect("mongodb+srv://clanand197:clanand1234@cluster0.k8uol.mongodb.net/e-commerce");

// API 

app.get("/",(req,res)=>{
    res.send("Express App set!!!");
})

// Image storage
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage:storage})

// upload endpoint
app.use('/images',express.static('upload/images'))

app.post("/upload", upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    })
})

// Schema for products
const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true,
    },
    name:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    new_price:{
        type:Number,
        required:true,
    },
    old_price:{
        type:Number,
        required:true,
    },
    date:{
        type:Date,
        default: Date.now,
    },
    available:{
        type:Boolean,
        default:true,
    },
})

// To add a product
app.post('/addproduct',async (req,res)=>{
    let products = await Product.find({});
    let id;
    if(products.length > 0){
        let last_product_array=products.slice(-1);
        let last_product = last_product_array[0];
        id=last_product.id+1;
    }
    else{
        id=1;
    }
    const product = new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
    });
    console.log(product);
    await product.save();
    console.log("Product created");
    res.json({
        success:true,
        name:req.body.name,
    })
})

//  To delete product
app.post('/removeproduct', async (req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Product removed");
    res.json({
        success:true,
        name:req.body.name,
    })
})

// To get all products
app.get('/allproducts', async (req,res) => {
    let products = await Product.find({});
    console.log("Got all products");
    res.send(products);
})

// Schema for User 
const Users = mongoose.model('Users',{
    name:{
        type: String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type: String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

// Reg user
app.post('/signup', async (req,res)=>{
    let check = await Users.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({success:false,error:"User already exists"});
    }
    let cart ={};
    for (let index = 0; index < 300; index++) {
        cart[index] =0;
    }
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    })
    await user.save();

    const data = {
        user:{
            id:user.id
        }
    }

    const token = jwt.sign(data, 'secret_ecom');
    res.json({success:true,token});

})

// User login
app.post('/login',async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id,
                }
            }
            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true,token});
        }
        else{
            res.json({success:false,error:"Wrong password"});
        }
    }
    else{
        res.json({success:false,error:"Wrong Email ID"});
    }
})

// creating endpoint for newcollection
app.get('/newcollection',async (req,res)=>{
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("New Collection fetched");
    res.send(newcollection);
})

app.get('/popularinwomen',async (req,res)=>{
    let products = await Product.find({category:"women"});
    let popular_in_women = products.slice(0,4);
    console.log("Popular in women fetched")
    res.send(popular_in_women);
})

// Middleware to get user
const fetchUser = async (req,res,next)=>{
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({errors:"Please authenticate using valid token"})
    }
    else{
        try {
            const data = jwt.verify(token,'secret_ecom');
            req.user = data.user;
            next();
        } catch (error) {
            res.status(401).send({errors:"Please authenticate using valid token"})
        }
    }
}

// Add to cart
app.post('/addtocart',fetchUser, async (req,res)=>{
    console.log=("added ",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Added to cart");
})

// To remove from cart
app.post('/removefromcart',fetchUser,async (req,res) => {
    console.log=("removed ",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId] > 0){
        userData.cartData[req.body.itemId] -= 1;
    }
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Removed from cart");
})

// to getCartData
app.post('/getcart',fetchUser, async (req,res)=>{
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
})

app.listen(port,(err) =>{
    if( !err){
        
        console.log(`server is running http://localhost:${port}`);
    }
    else{
        console.log("Error: " + err);
    }
})