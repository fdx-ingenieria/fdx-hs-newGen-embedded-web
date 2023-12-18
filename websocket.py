import asyncio
import websockets
import json
import datetime
import random
import time

# Define a global variable to store the data
labels_stored_data = {
    "device": "your_text_here",
    "equipment": [
        "Not installed",
        "equipment_0",
        "equipment_1",
        "equipment_2",
        "equipment_3"
    ],
    "position": [
        "Not installed",
        "phase_0",
        "phase_1",
        "phase_2",
        "neutral_3",
        "ambient"
    ],
    "location": [
        "Not installed",
        "cable_in",
        "cable_out",
        "switchgear_in",
        "switchgear_out",
        "busbar_0",
        "busbar_1"
    ]
}

sensors_stored_data = {
    'data': [
        {
            'id': 10995384722910999987,
            'EPC': hex(10995384722910999987),
            'config': {
                'location': 1,
                'position': 1,
                'equipment': 1,
            }
        },
        {
            'id': 10995384722910999988,
            'EPC': hex(10995384722910999988),
            'config': {
                'location': 2,
                'position': 2,
                'equipment': 2,
            }
        },
    ]
}

system_stored_data = {
    'serial_num': 10995384722910999988,
    'modbus_address': random.randint(1, 247),
    'baud_rate': 9600,
    'bit_parity': 0,
}

alarm_stored_data = {
    'data': [
        {
            'id': 0,
            'name': 'alarm_1',
            'set_point': random.randint(0, 140),
            'alarm_type': random.randint(0, 3),
            'relay_flag' : random.randint(0, 2),
            'fields': [
                {
                    'location': 1,
                    'equipment': 2
                }
            ]
        },
        {
            'id': 1,
            'name': 'alarm_2',
            'set_point': random.randint(0, 140),
            'alarm_type': random.randint(0, 3),
            'relay_flag' : random.randint(0, 2),
            'fields': [
                {
                    'location': 1,
                    'equipment': 2
                },
                {
                    'location': 4,
                    'equipment': 5
                }
            ]
        },
        {
            'id': 2,
            'name': 'alarm_3',
            'set_point': 0,
            'alarm_type': 0,
            'relay_flag' : 0,
            'fields': []
        },
    ]
}
# Modbus Table
modbus_table = {
    "data": [
        {
            "name": "System",
            "columns": [
                "MODBUS Address",
                "Parameter",
                "Options"
            ],
            "values": [
                [0,"Serial number","1st segment: 0 - 6535"],
                [1,"Serial number","2nd segment: 0 - 6535"],
                [2,"Serial number","3rd segment: 0 - 6535"],
                [3,"Serial number","4th segment: 0 - 6535"],
                [4,"Version","System release version: 0 - 6535"],
                [5,"Label Version","Labeling version: 0 - 6535"],
                [6,"Reader temperature","Integer ranging: 0 - 120 °C"]
            ]
        },
        {
            "name": "Other table",
            "columns": [
                "Id",
                "a column"
            ],
            "values": [
                [0,"1st segment: 0 - 6535"],
                [1,"2nd segment: 0 - 6535"],
                [2,"3rd segment: 0 - 6535"],
                [3,"4th segment: 0 - 6535"],
                [4,"System release version: 0 - 6535"],
                [5,"Labeling version: 0 - 6535"],
                [6,"Integer ranging: 0 - 120 °C"]
            ]
        },
        {
            "name": "Sensors",
            "columns": [
                "Sensor ID",
                "Location",
                "Equipment",
                "Position",
                "MODBUS Address",
                "Parameter",
                "Options"
            ],
            "values": [
                ["A51P","Sector 1","Motor 1","Cable entry 2",220],
                ["A57P","Sector 1","Motor 2","Cable entry 4",230]
            ],
            "autoincrementColumn": 4,
            "commonRows": [
                ["Temperature","Integer value: -40-120 °C"],
                ["Alarm","0: OFF , 1: ON"],
                ["Quality","0: Out of service , 1: Bad , 2: Regular , 3: Good, 4: Excellent"],
                ["Sensor ID","Sensor ID decimal of 2 chars: High Part"],
                ["Sensor ID","Sensor ID decimal of 2 chars: Low Part"],
                ["Location","Measuring point location"],
                ["Equipment","Measuring point equipment"],
                ["Position","Measuring point position"]
            ]
        }
    ]
}
# alarm types
# (0:non set,1: absolute, 2: unbalance, 3:dispersión)

# relay_flag
# (0: non set, 1: rele 1, 2: rele 2)

qualityString = ['Out of service', 'Bad', 'Regular', 'Good', 'Excellent']

async def discoveryMode(websocket):
    # try:
    print('Starting Discovery mode')
    while True:
        await asyncio.sleep(5)
        print('Sending sensor data... discovery mode')
        # Prepare the JSON response with the new sensor data
        response_data = {
            'cmd': 'new_sensor_data',
            'arg': 'get_all',
            'data': [],
            'status': 'ok',
        }
        for i in sensors_stored_data['data']:
            response_data['data'].append({
                'id': i['id'],
                'EPC': hex(i['id']),
                'avg_temp': round(random.uniform(20, 30), 6),
                'temp': round(random.uniform(20, 30), 6),
                'std_dev': round(random.uniform(0, 5), 6),
                'n_readings': random.randint(0, 15),
                'quality': qualityString[random.randint(0, 4)],
                'rssi': round(random.uniform(-100, 0),6),
                'elapsed_time': random.randint(0, 90),
                'timestamp': int(time.time())
            })
        if random.randint(1, 10) < 4:
            print('New sensor found... discovery mode')
            id = random.randint(10000000000000, 99999999999999)
            element = {
                'id': id,
                'EPC': hex(id),
                'avg_temp': round(random.uniform(20, 30), 2),
                'temp': round(random.uniform(20, 30), 2),
                'std_dev': round(random.uniform(0, 5), 2),
                'n_readings': random.randint(0, 15),
                'quality': qualityString[random.randint(0, 4)],
                'rssi': random.randint(0, 100),
                'elapsed_time': 0,
                'timestamp': int(time.time())
            }
            sensors_stored_data.get('data').append({
                'id': element['id'],
                'EPC': hex(id),
                'config': {
                    'location': 0,
                    'position': 0,
                    'equipment': 0,
                }
            })
            response_data['data'].append(element)
        
        # Convert the response to JSON and send it back to the client
        response = json.dumps(response_data)
        await websocket.send(response)
    # except:
    #     print ("Task ended")

async def normalMode(websocket):
    print('Starting Normal mode')
    while True:
        await asyncio.sleep(15)
        print('Sending sensor data')
        # Prepare the JSON response with the new sensor data
        response_data = {
            'cmd': 'new_sensor_data',
            'arg': 'get_all',
            'data': [],
            'status': 'ok',
        }
        for i in sensors_stored_data['data']:
            response_data['data'].append({
                'id': i['id'],
                'EPC': hex(i['id']),
                'avg_temp': round(random.uniform(20, 30), 2),
                'temp': round(random.uniform(20, 30), 2),
                'std_dev': round(random.uniform(0, 5), 2),
                'n_readings': random.randint(0, 15),
                'quality': qualityString[random.randint(0, 4)],
                'rssi': random.randint(0, 100),
                'elapsed_time': random.randint(0, 90),
                'timestamp': int(time.time())
            })

        # Convert the response to JSON and send it back to the client
        response = json.dumps(response_data)
        await websocket.send(response)

        print('Sending alarms data')
        # Prepare the JSON response with the new sensor data
        response_data = {
            'cmd': 'alarm_data',
            'arg': 'get_all',
            'data': [],
            'status': 'ok',
        }

        for i in alarm_stored_data['data']:
            sensors = [
                    {
                        'id': 10995384722910999987,
                        'EPC': hex(10995384722910999987),
                        'state': random.choice([0, 1]),
                    },
                    {
                        'id': 10995384722910999988,
                        'EPC': hex(10995384722910999988),
                        'state': random.choice([0, 1]),
                    }
                ]
            randChoice = random.randint(1, 10)
            print('choice', randChoice)
            if  randChoice < 2:
                del sensors[0]
            if randChoice > 2 and randChoice < 7:
                del sensors[1]

            # Verificar si alguno de los elementos es 1
            is_alarmed = any(ele['state'] == 1 for ele in sensors)
            response_data['data'].append({
                'id': i['id'],
                'state': is_alarmed,
                'sensors': sensors,
            })

        # Convert the response to JSON and send it back to the client
        response = json.dumps(response_data)
        await websocket.send(response)
    # except:
    #     print ("Task ended")

async def tempUpdate(websocket):
    # try:
    print('Starting Temp updates task')
    while True:
        await asyncio.sleep(20)
        print('Sending temp data...')
        # Prepare the JSON response with the new sensor data
        response_data = {
            'cmd': 'reader_temp',
            'arg': 'get',
            'data': round(random.uniform(5, 90), 2),
            'status': 'ok',
        }
        # Convert the response to JSON and send it back to the client
        response = json.dumps(response_data)
        await websocket.send(response)
    # except:
    #     print ("Task ended")

def replace_sensor(sensor_EPC, new_sensor):
    for i, sensor in enumerate(sensors_stored_data['data']):
        if sensor['EPC'] == sensor_EPC:
            sensors_stored_data['data'][i] = new_sensor
            break

def update_sensor_config(sensor_EPC, new_config):
    for sensor in sensors_stored_data['data']:
        if sensor['EPC'] == sensor_EPC:
            sensor['config'].update(new_config)
            break

async def handle_websocket(websocket, path):
    discoveryModeTask = None
    normalModeTask = None
    print('Starting websocket connection')
    asyncio.create_task(tempUpdate(websocket))
    try:
        # Handle messages received from the client
        async for message in websocket:
            print('Received message:', message)

            # Convert the received message to a string
            message_string = message

            # Parse the received JSON data
            try:
                received_data = json.loads(message_string)
                # print('Parse message:', received_data)
            except json.JSONDecodeError as error:
                print('Failed to parse JSON:', error)
                continue
            # System Config
            if "cmd" in received_data and received_data["cmd"] == "hs_config":
                if "arg" in received_data and received_data["arg"] == "get":
                    # Prepare the JSON response with the stored data
                    response_data = {
                        'cmd': 'hs_config',
                        'arg': 'get',
                        'data': system_stored_data,
                        'status': 'ok',
                    }
                    # Convert the response to JSON and send it back to the client
                    response = json.dumps(response_data)
                    await websocket.send(response)

                elif "arg" in received_data and received_data["arg"] == "set":
                    # Check if the "data" field is present in the received message
                    if "data" in received_data:
                        # Update the labels_stored_data with the new value from "data"
                        system_stored_data.update(received_data["data"])

                        # Send a success response back to the client
                        response_data = {
                            'cmd': 'label',
                            'arg': 'set',
                            'data': system_stored_data,
                            'status': 'ok',
                        }

                        response = json.dumps(response_data)
                        await asyncio.sleep(2)
                        await websocket.send(response)
                    else:
                        # If "data" field is missing in the received message, send an error response
                        response_data = {
                            'status': 'error',
                            'message': 'Invalid command: "data" field is missing',
                        }
                        response = json.dumps(response_data)
                        await websocket.send(response)
                else:
                    # If the received "arg" is neither "get" nor "set", send an error response
                    response_data = {
                        'status': 'error',
                        'message': 'Invalid argument',
                    }
                    response = json.dumps(response_data)
                    await websocket.send(response)
            elif "cmd" in received_data and received_data["cmd"] == "modbus_table":
                if "arg" in received_data and received_data["arg"] == "get":
                    # Prepare the JSON response with the stored data
                    response_data = {
                        'cmd': 'modbus_table',
                        'arg': 'get',
                        'data': modbus_table.get('data'),
                        'status': 'ok',
                    }
                    # Convert the response to JSON and send it back to the client
                    response = json.dumps(response_data)
                    await websocket.send(response)
                else:
                    # If the received "arg" is neither "get" nor "set", send an error response
                    response_data = {
                        'status': 'error',
                        'message': 'Invalid argument',
                    }
                    response = json.dumps(response_data)
                    await websocket.send(response)
            # Labels
            elif "cmd" in received_data and received_data["cmd"] == "label":
                if "arg" in received_data and received_data["arg"] == "get_all":
                    # Prepare the JSON response with the stored data
                    response_data = {
                        'cmd': 'label',
                        'arg': 'get_all',
                        'data': labels_stored_data,
                        'status': 'ok',
                    }
                    # Convert the response to JSON and send it back to the client
                    response = json.dumps(response_data)
                    await websocket.send(response)

                elif "arg" in received_data and received_data["arg"] == "set_all":
                    # Check if the "data" field is present in the received message
                    if "data" in received_data:
                        # Update the labels_stored_data with the new value from "data"
                        labels_stored_data.update(received_data["data"])
                    else:
                        # If "data" field is missing in the received message, send an error response
                        response_data = {
                            'status': 'error',
                            'message': 'Invalid command: "data" field is missing',
                        }
                        response = json.dumps(response_data)
                        await websocket.send(response)
                else:
                    # If the received "arg" is neither "get" nor "set", send an error response
                    response_data = {
                        'status': 'error',
                        'message': 'Invalid argument',
                    }
                    response = json.dumps(response_data)
                    await websocket.send(response)
            # Alarm Config
            elif "cmd" in received_data and received_data["cmd"] == "alarm_config":
                if "arg" in received_data and received_data["arg"] == "get_all":
                    # Prepare the JSON response with the stored data
                    response_data = {
                        'cmd': 'alarm_config',
                        'arg': 'get_all',
                        'data': alarm_stored_data.get('data'),
                        'status': 'ok',
                    }
                    # Convert the response to JSON and send it back to the client
                    response = json.dumps(response_data)
                    await websocket.send(response)

                elif "arg" in received_data and received_data["arg"] == "set_all":
                    # Check if the "data" field is present in the received message
                    if "data" in received_data:
                        # Update the alarm_stored_data with the new value from "data"
                        alarm_stored_data.update({'data':received_data["data"]})
                    else:
                        # If "data" field is missing in the received message, send an error response
                        response_data = {
                            'status': 'error',
                            'message': 'Invalid command: "data" field is missing',
                        }
                        response = json.dumps(response_data)
                        await websocket.send(response)
                else:
                    # If the received "arg" is neither "get" nor "set", send an error response
                    response_data = {
                        'status': 'error',
                        'message': 'Invalid argument',
                    }
                    response = json.dumps(response_data)
                    await websocket.send(response)
            # Sensor Config
            elif "cmd" in received_data and received_data["cmd"] == "sensor_config":
                if "arg" in received_data and received_data["arg"] == "get_all":
                    # Prepare the JSON response with the sensor configurations
                    response_data = {
                        'cmd': 'sensor_config',
                        'arg': 'get_all',
                        'data': sensors_stored_data.get('data'),
                        'status': 'ok',
                    }

                    # Convert the response to JSON and send it back to the client
                    response = json.dumps(response_data)
                    await websocket.send(response)

                elif "arg" in received_data and received_data["arg"] == "set_all":
                    # Check if the "data" field is present in the received message
                    if "data" in received_data:
                        # Update the sensors_stored_data with the new value from "data"
                        sensors_stored_data.update({'data':received_data["data"]})
                    else:
                        # If "data" field is missing in the received message, send an error response
                        response_data = {
                            'status': 'error',
                            'message': 'Invalid command: "data" field is missing',
                        }
                        response = json.dumps(response_data)
                        await websocket.send(response)
                elif "arg" in received_data and received_data["arg"] == "set":
                    # Check if the "data" field is present in the received message
                    if "data" in received_data:
                        # Update the sensors_stored_data with the new value from "data"
                        update_sensor_config(received_data["data"]['EPC'], received_data["data"]['config'])
                    else:
                        # If "data" field is missing in the received message, send an error response
                        response_data = {
                            'status': 'error',
                            'message': 'Invalid command: "data" field is missing',
                        }
                        response = json.dumps(response_data)
                        await websocket.send(response)
                else:
                    # If the received "arg" is not "get_all", send an error response
                    response_data = {
                        'status': 'error',
                        'message': 'Invalid argument for sensor_configl',
                    }
                    response = json.dumps(response_data)
                    await websocket.send(response)
            # Sensor Discovery
            elif "cmd" in received_data and received_data["cmd"] == "discovery":
                if "arg" in received_data and received_data["arg"] == "start":
                    if discoveryModeTask is None:
                        discoveryModeTask = asyncio.create_task(discoveryMode(websocket))
                    else:
                        print('Discovery mode already started')
                elif "arg" in received_data and received_data["arg"] == "stop":
                    if discoveryModeTask is not None:
                        discoveryModeTask.cancel()
                        discoveryModeTask = None
                    else:
                        print('Discovery mode is already stopped')
                else:
                    # If the received "arg" is not "get", send an error response
                    response_data = {
                        'status': 'error',
                        'message': 'Invalid argument for discovery',
                    }
                    response = json.dumps(response_data)
                    await websocket.send(response)
            # Normal Mode
            elif "cmd" in received_data and received_data["cmd"] == "normal_mode":
                if "arg" in received_data and received_data["arg"] == "start":
                    if normalModeTask is None:
                        normalModeTask = asyncio.create_task(normalMode(websocket))
                    else:
                        print('Normal mode is already started')
                elif "arg" in received_data and received_data["arg"] == "stop":
                    if normalModeTask is not None:
                        normalModeTask.cancel()
                        normalModeTask = None
                    else:
                        print('Normal mode is already stopped')
                else:
                    # If the received "arg" is not "get", send an error response
                    response_data = {
                        'status': 'error',
                        'message': 'Invalid argument for discovery',
                    }
                    response = json.dumps(response_data)
                    await websocket.send(response)
            else:
                # If the received command is not {"cmd": "label"}, {"cmd": "sensor_config"}, or {"cmd": "new_sensor_data"}, send an error response
                response_data = {
                    'status': 'error',
                    'message': 'Invalid command',
                }
                response = json.dumps(response_data)
                await websocket.send(response)

    except websockets.exceptions.ConnectionClosedOK:
        if discoveryTask is not None:
            print('Discovery task cancelled')
            discoveryTask.cancel()
        print('WebSocket connection closed.')

async def main():
    async with websockets.serve(handle_websocket, "localhost", 8000):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
