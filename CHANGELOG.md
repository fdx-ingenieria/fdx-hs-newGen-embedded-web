## [0.3.0] - 2026-07-13

### Features

- *(global)* Mapeo entre tipos de backend refactorizado y front
- *(global)* Infrastructura para fetchear api html
- *(System)* Agrego mesaure_period_ms como param de system
- *(global)* Infraestructura de monitoreo de alarmas y sensores SSE
- Notificación para responses con error
- *(sensors)* Timer y contador ahora persisten en out of service
- *(sensors)* No configurados permanecen en lista al salir de discovery
- *(alarms)* Botón de save por elemento en lugar de bulk
- Notificaciones de success
- Gadget para mostrar modo de la app disovery/manual
- *(System)* Botón oculto para reiniciar el servicio fdx_api
- Nuevo estilo de frontend con modo oscuro/claro
- *(System)* Campo para escribir meassure_period_ms
- *(System)* Separo view de system con subsecciones modbus y system
- *(System)* Reconexión automática luego de reiniciar servicio
- *(gobal)* Notificaciones de severidad warning
- *(System)* Integro detección de antenas al view
- *(global, Overview)* Integro shorts epc_ids
- *(System)* View oculta para setear timers con deslizadores
- Indicador de modo y sección en System para cambiar de modo
- Backend para modo fast detection de Switchgear
- Presento votación de grupos por antena en tiempo real
- Lock manual de grupo por antena
- *(ReaderConfig)* Botón para restuarar config de fábrica

### Bug Fixes

- *(global)* Alarmas con histéresis no se mostraban en overview
- Evito duplicación de comandos en cambio de modo
- Botón de guardar rfid conf en español

### Refactor

- Proxy vite y limpieza de variables de entorno
- *(global)* Migro crud de labels y sensores a REST
- *(global)* Migro crud de alarmas a REST
- *(global)* Migro crud de sistema, modbus y rfid conf a REST
- *(App)* Migro monitoreo de socket a SSE
- *(global)* [**breaking**] Elimino connect y disconnect websocket
- *(nav)* [**breaking**] Adapto socket status a connection status
- *(global)* Renombro getNormaMode -> getNormalModeOn
- *(reader)* Nueva ux para campos admin-only
- *(System)* Reimplemento view y fixeo bug de serialización
- *(labels)* Escondo fila cero inasignable
- *(sensors)* Botón para eliminar y persistencia de descubiertos
- *(Overview)* Fixes de sensores alarmados y temp máx y min
- *(global)* Utilizo notificaciones de success en alarmas y sensors
- Utilizo notificaciones de error en reader, labels y system
- *(System)* Se entra al modo admin tocando view, no campo serial
- *(SensorTable)* Escondo los ceros de las epc largas
- *(global)* Manejo migración de todos los timers a system
- Actualizo logo fdx a versión 2026
- *(System)* Mejoro estilo en sección de detección de antenas
- Front para modo fast, e interacción con grupos

### Styling

- *(global)* Formateo updateSensorsData
- Muestro ver. de fw y wa en filas en lugar de columnas

### Miscellaneous Tasks

- [**breaking**] Elimino enums de socket deprecated
## [0.2.1] - 2026-05-28

### Bug Fixes

- Version de fw no aprecia adecuadamente
## [0.2.0] - 2026-05-26

### Features

- Manejo el comando de versión de fw introducido en hs
- Manejo el comando de alarma con histéresis
- Agrego view para modificar parametros de alarma con histéresis
- Setting oculta en reader para ajustar ancho de ventana de avgs
- Muestro versión de webapp en view general

### Bug Fixes

- Disconnect socket before refresh

### Miscellaneous Tasks

- Elimino node_modules commiteados
- Elimino output de compilación commiteado
- Reordeno y actualizo gitignore
- Bump version to 0.2.0
## [0.1.0] - 2024-06-13

### Features

- Socket status & mode improvements
- Improve button modes for better UX

### Bug Fixes

- Remove hidden class on small screens
- Enhance reactivity
- Alarmed counter
- Correct loading order of labels before sensors
- Sleep 1000 before send first message
- Correct loading order to prevent sync issue

### Refactor

- Enhance reactivity to eliminate duplicate code
- Implement custom logger to restrict logging in prod

### Miscellaneous Tasks

- Modbus table sync
- Remove unused pkg
- Replicate real scenario
- Add temp logs for debug
- Bumb version to 0.1.0
## [0.0.8] - 2024-06-07

### Features

- Scaffolding
- Add not found page
- Add navigation components
- Add right side bar comp
- Add labels comp
- Add sensors config comp
- Add system view
- Add overview & temperatures mock view
- Add router
- Add pinia state
- Add vite env vars
- Add request queue with 500ms delay
- Enable blank labels & add global save
- System view adjustments
- Sensors view adjustments
- Add get, set and view alarms
- Add filter to Alarms table
- Add loading icon on conf labels view
- Prevent duplicate labels based on type
- Implement clear unconfigured command
- Set max length for alarm names
- Add new icons
- Add overview
- Use elapsed time with intervals
- Add EPC property and filter
- System configuration and related enum/interface updates
- Hide reset action in sensor table
- Check duplicate sensor config
- Update individual sensor
- Global save for alarms
- Add modbus view
- Add modbus view
- Modbus print view
- Add board temp info
- Add reader config view & some improvements
- Set maxlength
- Change range and validate integers
- Add integer validation
- Pkgs upgrade
- Add afterEach router handler to close menu
- Add pinia persist plugin
- *(v0.0.4)* Several changes
- Ux improvements
- Ux improvements
- Several UX changes

### Bug Fixes

- Disable edit first element of each array tag
- Add missing config file
- Show sensor ID as hexa when it's being edited
- Hide empty labels
- Ensure normal mode starts after stopping discovery mode
- Allow multiple blank labels
- Support starting index at zero
- Improve async request
- Remove auto-stop on edits
- Handle bigint values
- Remove unnecessary data
- Check alarm fields completiton
- Not assignable type
- Trasition duration
- Stop normal mode if discovery is off
- Start normal mode after stop discovery mode
- Ts warning
- Socket reconnect
- Load entire page before get data
- Remove routes lazy loading
- Unexpected behavior on alarmed sensors
- Socket reconection handler
- Change to explicit imports
- Menu
- Remove typo
- Move sensors ids from number to string
- Move bk from 768 to 1024
- Handle left bar visibility
- Improve reactivity

### Refactor

- Group config views & shared tables improvements
- Improve async request handlers
- Add env vars for conf max retries and time between requests
- Improve UX on async events
- Implements new command names
- Send configured sensors only
- Enhance UX for sensors data
- Update mocks for improved sandbox
- Remove unnecessary code and files

### Miscellaneous Tasks

- Add icons
- Add commons
- Update gitignore
- Adjustments based on our latest meeting
- Code clean
- Clean code round 2
- Pkgs upgrade due to depbot
- Implements new command names
- Update mock socket server
- Test router hash mode
- Add elapsed_time
- Remove anchors
- Add EPC to mock server
- Update mock server for hs_system structure change
- Add modbus_table command
- Add temp reader task
- Fix indent
- Bump version to v0.0.5
- Bump version to v0.0.6
- Bump version to v0.0.8
