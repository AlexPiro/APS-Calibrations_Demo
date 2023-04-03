

class CustomCalibrationsExtension extends Autodesk.Viewing.Extension {

    constructor(viewer, options)
    {
        super(viewer, options);

        this.viewer = viewer;
        this.options = options;

        this.panel;
    }   

    load()
    {

        this.panel = new CustomCalibrationsPanel(this.viewer, this.viewer.container, 'panelId', 'Custom calibrations panel', {});

        this.viewer.addPanel(this.panel);

        return true;
    }

    unload()
    {
        return true;
    }

    onToolbarCreated(toolbar) 
    {
        
        var panel = this.panel;

        // Button 
        var button = new Autodesk.Viewing.UI.Button('custom-calib-btn');
        button.onClick = function(e) {

            panel.setVisible(!panel.isVisible());
        };

        button.setIcon('adsk-icon-measure-settings');
        button.setToolTip('Custom calibrations');
            
        // SubToolbar
        this.subToolbar = new Autodesk.Viewing.UI.ControlGroup('my-custom-toolbar');
        this.subToolbar.addControl(button);
      
        toolbar.addControl(this.subToolbar);

    }
    
}


class CustomCalibrationsPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(viewer, container, id, title, options)
    {
        super(container, id, title, options);
        
        this.viewer = viewer;

        this.container.style.top = "10px";
        this.container.style.left = "10px";
        this.container.style.width = "300px";
        this.container.style.height = "350px";
        this.container.style.resize = "none";

        this.measureExt = this.viewer.getExtension('Autodesk.Measure');

        this.urn = this.viewer.model.myData.urn;
        this.guid = this.viewer.model.getDocumentNode().data.guid;

        this.calibrations = [];
        this.currentUnit = '-';
        this.calibrationFactor = 1;

        this.createPanel();
        this.updateCalibrationsTable().then(
            ()=> this.setLastCalibration()
        );

        this.viewer.addEventListener(Autodesk.Viewing.MeasureCommon.Events.FINISHED_CALIBRATION, async (c) => {
            await this.addNewCalibration(c);

            this.updateCalibrationsTable()
        });

    }

    createPanel()
    {
        this.content = [
            '<div class="panel-container">',
            '<h3>Calibrations</h3>',
            '<p id="current-factor">Current scale factor: </p>',
            '<p id="current-units">Current units: </p>',
            '<table id="calibration-table">',
            '<tr>',
            '<th>#</th><th>Scale factor</th><th>Size</th><th>Unit</th><th>Set</th><th>Delete</th>',
            '</tr>',
            '</table>',
            '</div>'
        ].join('\n');

        this.scrollContainer = this.createScrollContainer();
        this.scrollContainer.style.height = 'calc(100% - 70px)';
        var childDiv = document.createElement('div');
        childDiv.innerHTML = this.content;
 
        this.scrollContainer.appendChild(childDiv);

        this.container.appendChild(this.scrollContainer);
    }


    getCalibrationFactor = function(_this) {
        return _this.measureExt.calibrationTool.getCalibrationFactor() || 1;
    }

    getCurrentUnit = function(_this) {
        return _this.measureExt.calibrationTool.getCurrentUnits();
    }

    setCalibration = function(_this, calibration) {
        _this.measureExt.calibrationTool.setCalibrationFactor(calibration.scaleFactor);
        _this.updateCalibrationsTable();
    }

    setLastCalibration = function() {
        if(this.calibrations.length > 0)
        {
            let lastCalibration = this.calibrations.reduce((a, b) => (a.date > b.date ? a : b));
            this.setCalibration(this, lastCalibration);
        } 
    }


    fetchCalibrations = async function() {
        let _this = this;
        let calibrations = await (await fetch(`/api/calibrations?urn=${_this.urn}&guid=${_this.guid}`)).json();

        return calibrations;
    }

    addNewCalibration = async function(calibration) {
        delete calibration.target;

        calibration.date = Date.now();
        calibration.urn = this.urn;
        calibration.guid = this.guid;

        await fetch('/api/calibrations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
              },
            body: JSON.stringify(calibration)
        })
    }


    deleteCalibration = async function(calibration) {
        let calibrationId = calibration.id;

        await fetch(`/api/calibrations/${calibrationId}`, {
            method: 'DELETE'
        });
    }


    async updateCalibrationsTable(context)
    {
        let _this;
        if(!this)
        {
            _this = context;
        }
        else
        {
            _this = this;
        }

        _this.calibrations = await _this.fetchCalibrations();
        const deleteCalibration = _this.deleteCalibration;
        const setCalibration = _this.setCalibration;
        const updateCalibrationsTable = _this.updateCalibrationsTable;
        
        const _context = _this;

        _this.currentUnit = _this.getCurrentUnit(_this);
        _this.calibrationFactor = _this.getCalibrationFactor(_this);

        let currentUnitLabel = document.getElementById('current-units');
        currentUnitLabel.innerHTML = `Current units: ${_this.currentUnit}`;

        let currentFactorLabel = document.getElementById('current-factor');
        currentFactorLabel.innerHTML = `Current scale factor: ${_this.calibrationFactor.toFixed(4)}`;

        let calibTable = document.getElementById('calibration-table')
        var rowCount = calibTable.rows.length;
        for (var i = rowCount - 1; i > 0; i--) {
            calibTable.deleteRow(i);
        }

        for (let i = 0; i < _this.calibrations.length; i++) {
            const element = _this.calibrations[i];
            let row = calibTable.insertRow(i +1);
            var idCell = row.insertCell(0);
            var scaleCell = row.insertCell(1);  
            var lengthCell = row.insertCell(2);    
            var unitCell = row.insertCell(3);    
            var setCell = row.insertCell(4);    
            var deleteCell = row.insertCell(5);

            idCell.innerHTML = i;
            scaleCell.innerHTML = element.scaleFactor.toFixed(4);
            lengthCell.innerHTML = element.size;
            unitCell.innerHTML = element.units;

            let setBtnId = `#set-${element.id.substring(0, 5)}`;
            setCell.innerHTML = [
                '<button id="' + setBtnId + '">',
                'Set',
                '</button>'
            ].join('\n');


            let setBtn = document.getElementById(setBtnId);
            setBtn.addEventListener('click', function(){
                setCalibration(_this, element);
            });

            let delBtnId = `#del-${element.id.substring(0, 5)}`;
            deleteCell.innerHTML = [
                '<button id="' + delBtnId + '">',
                'Delete',
                '</button>'
            ].join('\n');

            let delBtn = document.getElementById(delBtnId);
            delBtn.addEventListener('click', async function(){
                await deleteCalibration(element);
                updateCalibrationsTable(_context);
            });
            

        }

    
    }
    
    onClose() {
        console.log(' Panel closed');
    }
}


Autodesk.Viewing.theExtensionManager.registerExtension('CustomCalibrations', CustomCalibrationsExtension);