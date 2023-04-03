const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { AuthenticationClient } = require('forge-server-utils');

const { FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, PORT } = process.env;

let app = express();
app.use(express.static('public'));
app.use(express.json());


app.get('/', (req, res)=>{
    res.sendFile(path.join(__dirname, 'public/calibrations-panel.html'))
})

app.get('/api/auth/token', async (req, res)=> {
    try {
        const authClient = new AuthenticationClient(FORGE_CLIENT_ID, FORGE_CLIENT_SECRET);
        const token = await authClient.authenticate(['viewables:read']);
        res.json(token);
    } catch(err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

app.post('/api/calibrations', async (req, res)=>{
    let dataFile = path.join(__dirname, 'data', 'calibrations.json');
    if(!fs.existsSync(dataFile))
    {
        let emptyJson = '[]';
        fs.writeFileSync(dataFile, emptyJson);
    }

    let newCalibration = req.body;

    if(newCalibration == null)
    {
        return res.status(400).json({err: "Payload is empty"});
    }
    newCalibration.id = crypto.randomBytes(16).toString('hex');

    let calibrations = JSON.parse(fs.readFileSync(dataFile));
    calibrations.push(newCalibration);

    fs.writeFileSync(dataFile, JSON.stringify(calibrations));

    res.status(201).json(calibrations);
})

app.delete('/api/calibrations/:id', async (req, res)=>{
    let dataFile = path.join(__dirname, 'data', 'calibrations.json');
    if(!fs.existsSync(dataFile))
    {
        return res.status(404).json({err: "Not found"})
    }

    let calibId = req.params.id;

    let calibrations = JSON.parse(fs.readFileSync(dataFile));
    calibrations = calibrations.filter(c => c.id != calibId);

    fs.writeFileSync(dataFile, JSON.stringify(calibrations));

    res.status(200).json(calibrations);
})

app.get('/api/calibrations', async (req, res)=>{
    let dataFile = path.join(__dirname, 'data', 'calibrations.json');
    if(!fs.existsSync(dataFile))
    {
        return res.status(404).json({err: "Not found"})
    }

    const { urn, guid }  = req.query;

    let calibrations = JSON.parse(fs.readFileSync(dataFile));

    calibrations = calibrations.filter(c => c.urn === urn && c.guid === guid)

    res.status(200).json(calibrations);
})

app.listen(PORT, () => console.log(`Server listening on port ${PORT}...`));
