import React,{useState,useEffect}  from 'react';
import { PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';
import { TagList,TagsInput,Label,Button, Icon, Modal,Input,InlineField,Select, ConfirmModal,InlineSwitch,InteractiveTable,CellProps} from '@grafana/ui';
import axios from 'axios'
import { getBackendSrv } from "@grafana/runtime";

interface Props extends PanelProps<SimpleOptions> {}

export const DeviceTablePanel: React.FC<Props> = ({ options, data, width, height }) => {
  const [orgID,setOrgID] = useState()
  const [adminStatus,setAdminStatus] = useState();
  interface Devices {
    uuid: string, 
    deviceID: string,
    name: string,
    locationID: string,
    location: string,
    tags: string,
    status: string;
  } 
const [deviceList, setDeviceList] = useState<Array<Devices>>([]);

  const [table,setTable] = useState();
  const [idToEdit,setIDToEdit] = useState();
  const [idToDelete,setIDToDelete] = useState();
  // used for both ADD and EDIT
  const [addedID,setAddedID] = useState('')
  const [addedName,setAddedName] = useState('')
  const [addedTags,setAddedTags] = useState('')
  const [addedLocationID,setAddedLocationID] = useState<string|unknown>('')
  const [addedLocationName,setAddedLocationName] = useState('')
  const [locationOptions,setLocationOptions] = useState([])
  const [tags, setTags] = useState<string[]>([]);
  const [deviceTags,setDeviceTags] = useState<string[]>([]);
  //used to control modal
  const [addOpen,setAddOpen] = useState(false)
  const [addButton,setAddButton] = useState<Element|JSX.Element>();
  const [deleteOpen,setDeleteOpen] = useState(false)
  const [editOpen,setEditOpen] = useState(false)

  const [renderState,setRenderState] = useState(true)

  // User info
  useEffect( () => {
    const getOrg = async () => {
      const res = await getBackendSrv().get('/api/org');
      setOrgID(res['id'])
    };
    const getUser = async () => {
      const res = await getBackendSrv().get('/api/user');
      setAdminStatus(res.isGrafanaAdmin)
    };
    // * Get location list on render
    getOrg();
    getUser();
  },[]
  )
  // Create Add button
  useEffect(() => {
    if (adminStatus === true){
      let button =  <Button onClick = {() => {setAddOpen(true)}}>+ Add Device</Button>
      setAddButton(button)
    }
  },[adminStatus])
  // Get get devices and locations
  useEffect( () => {
    const getLocations = async () => {
      const res = await axios.get(' https://or7f7hhi9c.execute-api.us-east-1.amazonaws.com/dev/getdata',{params: {organizationID: orgID}})
      let fetchedData = res.data
      let options: Array<{label: string, value: string}> = []
      for (let i = 0;i<fetchedData.length;i++){
        options.push(
          {
            label: fetchedData[i]['name'],
            value: fetchedData[i]['id']
          }
        )
      }
    setLocationOptions(options as any)
    }
    getLocations();
  },[orgID,renderState]
  )
  useEffect( () => {
    // * Get location list on render
    const getDevices = async () => {
      const res = await axios.get('https://iclrp6escf.execute-api.us-east-1.amazonaws.com/dev/getdata',{params: {organizationID: orgID}})
      let deviceData= res.data
      let deviceInfo: Array<{uuid: string, deviceID: string,name: string,locationID: string,location: string,tags: string,status: string}> =[]
      for (let i = 0; i < deviceData.length;i++){
        let locationName = ''
        let locationID = ''
        // ! do we have to loop through to get locations?
        for (let j = 0; j < locationOptions.length;j++){
          if (locationOptions[j]['value'] === deviceData[i]['locationID']){
            locationID = locationOptions[j]['value']
              locationName = locationOptions[j]['label']
          }
        }
       deviceInfo.push(
      {
          uuid: deviceData[i]['id'],
          deviceID: deviceData[i]['deviceID'],
          name: deviceData[i]['deviceName'],
          locationID : locationID,
          location: locationName,
          tags: deviceData[i]['tags'].split(','),
          status: deviceData[i]['status']
        }
          
        )
      }
    setDeviceList(deviceInfo)
    }
    getDevices();
  },[orgID,renderState,locationOptions]
  )
  //  Create table
 useEffect( () => {
  /*
    interface TableData {
      id: string
      name: string;
      monitoredArea: string;
      licBuild: string;
      licSimulation: string;
    }
  */
    // Function for handling edits
    const handleEditOpen = (event: any,deviceList: any) => {
      //let deviceUUID = event.target.parentElement.id
      let deviceUUID = event.target.parentElement.id
      
      setIDToEdit(deviceUUID)
      
      // Get ID,name,location,tags
      for (let i = 0; i < deviceList.length;i++){
        if (deviceList[i]['uuid'] === deviceUUID){
          setAddedName(deviceList[i]['name'])
          setAddedID(deviceList[i]['deviceID'])
          setDeviceTags(deviceList[i]['tags'])
          setAddedLocationID(deviceList[i]['locationID'])
          setAddedLocationName(deviceList[i]['location'])
        }
      }
      setEditOpen(true)
      //setRenderState(!renderState)
    }
    // Function for handling MQTT controls
    const handleMqttControls = (event: any) =>{
      console.log(event.target.id)
      let deviceUUID = event.target.id
      let deviceName = ''
      let deviceID = ''
      for (let i = 0; i < deviceList.length;i++){
        if (deviceList[i]['uuid'] === deviceUUID){
          deviceName = (deviceList[i]['name'])
          deviceID = (deviceList[i]['deviceID'])
        }
      }
      if (event.target.checked === true){
        axios.post(' https://iclrp6escf.execute-api.us-east-1.amazonaws.com/dev/mqttcontrols',{id:event.target.id,deviceName:deviceName,deviceID:deviceID,deviceStatus: 'On'}).then((res)=>{console.log(res)}).catch((err)=>console.log(err))
      }
      if (event.target.checked === false){
        axios.post(' https://iclrp6escf.execute-api.us-east-1.amazonaws.com/dev/mqttcontrols',{id:event.target.id,deviceName:deviceName,deviceID:deviceID,deviceStatus: 'Off'}).then((res)=>{console.log(res)}).catch((err)=>console.log(err))
      }
    }
    // * Construct custom cell for 'Status' 

    const StatusCell = ({
      row: {
        original: { uuid,status },
      },
    }: CellProps< void>) => {

      return (
            <InlineSwitch onChange={handleMqttControls} id = {uuid}defaultChecked = {handleDeviceStatus(status)} ></InlineSwitch>
      );
    };
    const EditCell = ({
      row: {
        original: { uuid },
      },
    }: CellProps<void>) => {
      // construct cells
      return (
        <Icon id = {uuid} name = "edit" onClick = {(id) => {handleEditOpen(id,deviceList)}}/>
      );
    };
    // * Construct custom cell for 'Delete' 
    
    const DeleteCell = ({
      row: {
        original: { uuid },
      },
    }: CellProps<void>) => {
      // construct cells
      return (
        <Icon id = {uuid} name = "trash-alt" onClick = {(uuid) => {handleDeleteOpen(uuid)}}/>
      );
    };
    
    const TagCell = ({
      row: {
        original: {tags },
      },
    }: CellProps<void>) => {
      // construct cells
      return (
       
        <TagList tags = {tags}/>
      );
    };
    let columnArray = [
      { id: 'name', header: 'Device Name',cell:CellProps<void>},
      {id : 'tags', header: 'Device Tags',cell:TagCell},
      {id : 'location', header: 'Device Location'},
      {id : 'status', header: 'Device Status',cell:StatusCell},
    ]
    if (adminStatus === true){
      columnArray.push(
      {id: 'edit', header:'Edit Device', cell: EditCell },
      {id: 'delete', header:'Delete Device', cell: DeleteCell }
      
      )
      
    }
    const tableData = deviceList
    console.log("Device list",deviceList)
    
    const columns = columnArray
    setTable(<InteractiveTable
    columns={columns}
    data={tableData}
    getRowId={(r: any) => r.uuid}/> as any)
    
}, [deviceList,adminStatus,renderState])

  // IoT Functions
  const handleDeviceStatus = (deviceStatus: any) =>{
    console.log(deviceStatus)
    if (deviceStatus === 'On'){
      return true
    }
    else{
      return false
    }
  }
  // Modal operations
  useEffect ( () => {
    let tagsToStr = tags.join()
    setAddedTags(tagsToStr)
  },[tags])
  const handleAddDevice = () => {
    axios.post(' https://iclrp6escf.execute-api.us-east-1.amazonaws.com/dev/postdata',{deviceID:addedID,name: addedName,tags:addedTags,status:'off',locationID:addedLocationID,organizationID:orgID}).then((res)=>console.log(res)).catch((err)=>console.log(err))
    setAddOpen(false)
  }
  const handleDeleteOpen = (event: any) => {
    let deviceUUID = event.target.parentElement.id
    setIDToDelete(deviceUUID)
    setDeleteOpen(true)
  }
  const handleDeleteConfirmed = ()=>{
    (async () => { 
      await axios.delete('https://iclrp6escf.execute-api.us-east-1.amazonaws.com/dev/deletedata', { data: { uuid: idToDelete } }).then((res)=>console.log(res)).catch((err)=>console.log(err))
      })();
    setDeleteOpen(!deleteOpen)
    setRenderState(!renderState)
  }

  const handleEditDevice = () => {
    axios.post('https://iclrp6escf.execute-api.us-east-1.amazonaws.com/dev/updatedata',{deviceUUID:idToEdit,deviceID:addedID,name: addedName,tags:deviceTags.join(),locationID:addedLocationID}).then((res)=>console.log(res)).catch((err)=>console.log(err))
    setEditOpen(false)
  }
  // Event handling
  const handleID = (event: any) => {
    setAddedID(event.target.value)
  }
  const handleName = (event: any) => {
    setAddedName(event.target.value)
  }
  const handleLocationName= (event: any) => {
    setAddedLocationName(event.target.value)
  }
  return(
    <div>
      {addButton}
      <Modal isOpen = {addOpen} title={'Add Device'}>
          <InlineField  label = "Device Name" >
              <Input placeholder = {"Device Name"} onChange = {handleName}/>
          </InlineField>
          <InlineField  label = "Device ID" >
              <Input placeholder = {"Device ID"} onChange = {handleID}/>
          </InlineField>
          <InlineField  label = "Tags">
            <TagsInput placeholder = {"Tags"} tags={tags} onChange = {setTags}></TagsInput>
          </InlineField>
          <InlineField  label = "Location" onChange = {handleLocationName}>
           <Select options={locationOptions} onChange = {(v) => {setAddedLocationID(v.value)}}/>
        </InlineField>
            <Modal.ButtonRow>
                <Button variant = "secondary" fill = "outline" onClick = {()=>{setAddOpen(false)}}>Cancel</Button>
                <Button onClick = {handleAddDevice}> Add Device</Button>
            </Modal.ButtonRow>
        </Modal>
        <ConfirmModal
          isOpen={deleteOpen}
          title="Delete device"
          body={"Are you sure you want to delete " + idToDelete + "?"}
          confirmText="Confirm"
          icon="exclamation-triangle"
          onConfirm={handleDeleteConfirmed}
          onDismiss={()=>{setDeleteOpen(false)}}
      />
      <Modal title ={"Edit a device"} isOpen = {editOpen}
      >
        
        <Label >UUID: {idToEdit}</Label>

        <InlineField  label = "Device ID" >
          <Input placeholder = {addedID} onChange = {handleID}/>
        </InlineField>
        <InlineField  label = "Device Name" onChange = {handleName} >
          <Input placeholder = {addedName} />
         </InlineField>
        <InlineField  label = "Tags">
        <TagsInput placeholder = {"Tags"} tags={deviceTags} onChange = {setDeviceTags}></TagsInput>
        </InlineField>
        <InlineField  label = "Location" onChange = {handleLocationName}>
        <Select placeholder = {addedLocationName} options={locationOptions} onChange = {(v) => setAddedLocationID(v.value)}/>
        </InlineField>
        <Modal.ButtonRow>
          <Button variant = "secondary" fill = "outline" onClick = {()=>{setEditOpen(false)}}>Cancel</Button>

          <Button onClick = {handleEditDevice}> Edit Device</Button>
        </Modal.ButtonRow>
        </Modal>
        {table}
    </div>
  )
};
