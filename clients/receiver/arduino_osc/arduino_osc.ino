#include <WiFiNINA.h>
#include <OSCMessage.h>
#include <OSCBundle.h>

WiFiUDP udpClient;

const char WIFI_SSID[] = "Uzi";
const char WIFI_PASS[] = "danny1234";

int status = WL_IDLE_STATUS;

void setup() {
  Serial.begin(9600);
  if (!Serial) delay(2000);
  Serial.println("Connecting to WiFi.");
  while (status != WL_CONNECTED) {

    Serial.print("Attempting to connect to Network ");
    Serial.println(WIFI_SSID);      
    status = WiFi.begin(WIFI_SSID, WIFI_PASS);
    delay(1000);

  }
  Serial.print("WiFi connected.\nIP address: ");
  Serial.println(WiFi.localIP());

  udpClient.begin(10000);

  // udp.begin(5000); 
  // IMU.begin();
}

char messageBuffer[512];

void loop(){ 
  OSCBundle bundleIN;
   int size;
 
  if( (size = udpClient.parsePacket())>0)
  {
    while(size--)
      bundleIN.fill(udpClient.read());

    // if(!bundleIN.hasError())
    //   bundleIN.route("/tone", routeTone);
    bundleIN.route("/yaw", test);

  }
}

void test(OSCMessage &msg, int addrOffset ){
  Serial.println(msg.getInt(0));
}