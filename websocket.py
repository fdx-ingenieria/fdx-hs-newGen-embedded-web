import asyncio
import websockets
import json
import datetime
import random

# Define a global variable to store the data
stored_data = {
    "device": "your_text_here",
    "equipment": [
        "equipment_0",
        "equipment_1",
        "equipment_2",
        "equipment_3"
    ],
    "position": [
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

async def handle_websocket(websocket, path):
    try:
        # Handle messages received from the client
        async for message in websocket:
            print('Received message:', message)

            # Convert the received message to a string
            message_string = message

            # Parse the received JSON data
            try:
                received_data = json.loads(message_string)
            except json.JSONDecodeError as error:
                print('Failed to parse JSON:', error)
                continue

            if "cmd" in received_data and received_data["cmd"] == "label":
                if "arg" in received_data and received_data["arg"] == "get":
                    # Prepare the JSON response with the stored data
                    response_data = {
                        'cmd': 'label',
                        'arg': 'get',
                        'data': stored_data,
                        'status': 'ok',
                    }
                    # Convert the response to JSON and send it back to the client
                    response = json.dumps(response_data)
                    await websocket.send(response)

                elif "arg" in received_data and received_data["arg"] == "set":
                    # Check if the "data" field is present in the received message
                    if "data" in received_data:
                        # Update the stored_data with the new value from "data"
                        stored_data.update(received_data["data"])

                        # Send a success response back to the client
                        response_data = {
                            'cmd': 'label',
                            'arg': 'get',
                            'data': stored_data,
                            'status': 'ok',
                        }

                        response = json.dumps(response_data)
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

            elif "cmd" in received_data and received_data["cmd"] == "sensor_configl":
                if "arg" in received_data and received_data["arg"] == "get_all":
                    # Prepare the JSON response with the sensor configurations
                    response_data = {
                        'cmd': 'sensor_configl',
                        'arg': 'get_all',
                        'data': [],
                        'status': 'ok',
                    }
                    # Generate 9 elements and add them to the response
                    for i in range(9):
                        EpcId = f"{i:04}"  # Format the EpcId as a 4-digit number
                        loc = str(i % 6 + 1)  # Generate a location between 1 and 6
                        pos = str(i % 5 + 1)  # Generate a position between 1 and 5
                        equip = str(i % 4 + 1)  # Generate an equipment between 1 and 4

                        element = {
                            'id': EpcId,
                            'config': {
                                'location': loc,
                                'position': pos,
                                'equipment': equip,
                            }
                        }

                        response_data['data'].append(element)

                    # Convert the response to JSON and send it back to the client
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

            elif "cmd" in received_data and received_data["cmd"] == "new_sensor_data":
                if "arg" in received_data and received_data["arg"] == "get":
                    # Prepare the JSON response with the new sensor data
                    response_data = {
                        'cmd': 'new_sensor_data',
                        'arg': 'get',
                        'data': [],
                        'status': 'ok',
                    }
                    # Generate 9 elements and add them to the response
                    for i in range(9):
                        EpcId = f"{i:04}"  # Format the EpcId as a 4-digit number
                        avg_temp = round(random.uniform(20, 30), 2)  # Generate an average temperature between 20 and 30
                        temp = round(random.uniform(20, 30), 2)  # Generate a temperature between 20 and 30
                        dev = round(random.uniform(0, 5), 2)  # Generate a standard deviation between 0 and 5
                        readings = random.randint(0, 15)  # Generate a number of readings between 0 and 15
                        quality = random.randint(0, 4)  # Generate a quality value between 0 and 4

                        element = {
                            'id': EpcId,
                            'avg_temp': avg_temp,
                            'temp': temp,
                            'std_dev': dev,
                            'n_readings': readings,
                            'quality': quality,
                        }

                        response_data['data'].append(element)

                    # Convert the response to JSON and send it back to the client
                    response = json.dumps(response_data)
                    await websocket.send(response)

                else:
                    # If the received "arg" is not "get", send an error response
                    response_data = {
                        'status': 'error',
                        'message': 'Invalid argument for new_sensor_data',
                    }
                    response = json.dumps(response_data)
                    await websocket.send(response)

            else:
                # If the received command is not {"cmd": "label"}, {"cmd": "sensor_configl"}, or {"cmd": "new_sensor_data"}, send an error response
                response_data = {
                    'status': 'error',
                    'message': 'Invalid command',
                }
                response = json.dumps(response_data)
                await websocket.send(response)

    except websockets.exceptions.ConnectionClosedOK:
        print('WebSocket connection closed.')

# Start the WebSocket server
start_server = websockets.serve(handle_websocket, 'localhost', 8000)

# Run the event loop
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
