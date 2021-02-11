require('dotenv').config();
const express = require('express'),
	app = express(),
	fs = require('fs'),
	fileUpload = require('express-fileupload'),
	AWS = require('aws-sdk');
	mongodb = require('mongodb'),
	cors = require('cors');

var MongoClient = mongodb.MongoClient;
var url = process.env.MONGOURL;

app.use(cors())

function agregarVideo(obj, callback) {
	MongoClient.connect(url, function(err, db) {
		if(err) throw err;
		var dbo = db.db('felican');
		dbo.collection('videos').insertOne(obj, (err, res) => {
			if(err) throw err;
			callback(res)
		})
	})
}

const s3 = new AWS.S3({
	accessKeyId: process.env.ACCESSKEY,
	secretAccessKey: process.env.SECRETKEY
})

function exists(file, callback) {
	const params = {
		Bucket: process.env.BUCKET
	}
	var existe = false;
	s3.listObjects(params, function(err, data) {
		for(archivo of data.Contents) {
			if(archivo.Key === file.name) {
				existe = true;
			}
		}
		return callback(existe);
	})
	
	
}


function uploadFile(file, callback) {
	const params = {
		Bucket: process.env.BUCKET,
		Key: file.name,
		Body: file.data
	}
	s3.upload(params, function(err, data) {
		if(err) throw err;
		console.log(`File uploaded successfully. ${data.Location}`)
		callback(data.Location);
	})
}

app.listen((process.env.PORT || 3000), () => {
	console.log('Running on port: ' + (process.env.PORT || 3000))
})

app.use(fileUpload({
	limits: { fileSize: 5000 * 1024 * 1024 },
}));

app.get('/', (req, res) => {
	//res.sendStatus(200)
	res.redirect('https://main.d2edn3ibq43045.amplifyapp.com/');
})

app.get('/subirVideo', (req, res) => {
	res.sendFile(__dirname + '/paginas/subirvideo.html')
})


app.post('/subirVideo', (req, res) => {
	exists({name: req.files['FormControlFile1'].name}, (existe) => {
		if(existe) {
			res.sendFile(__dirname + '/paginas/archivoDuplicado.html');
		}
		else {
			console.log(req.body);
			req.files['FormControlFile1'].name = req.body.matricula + '_' + req.files['FormControlFile1'].name;
			uploadFile(req.files['FormControlFile1'], (ubicacion) => {
				var obj = {
					nombre: req.body.nombre,
					matricula: req.body.matricula,
					descripcion: req.body.desc,
					videoUrl: ubicacion,
					creado: new Date()
				}
				agregarVideo(obj, () => {
					res.sendFile(__dirname + '/paginas/agregadoConExito.html')
				})
			})
		}
	})
})

app.get('/api/videos', (req, res) => {
	MongoClient.connect(url, function(err, db) {
		if(err) throw err;
		var dbo = db.db('felican');
		//console.log(cantidad);
		dbo.collection('videos').find({}).toArray(function(err, resultado)  {
			if(err) throw err;
			var resultados = [];
			if(req.query.limite !== undefined) {
				for(var i = 0; i < req.query.limite; i++) {
					console.log(resultado.length)
					resultados[resultados.length] = resultado[Math.floor(Math.random() * resultado.length)];
				}
				res.send(resultados);
			}
			else {
				res.send(resultado)
			}
		})
	})
})
