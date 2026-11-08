import React, { useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { NeighborhoodModal } from './NeighborhoodModal';
import { SavedPlace } from '../types';
import * as Location from 'expo-location';

interface Props {
  visible: boolean;
  places: SavedPlace[];
  activePlaceId?: string;
  onClose: () => void;
  onSelect: (place: SavedPlace) => void;
  onAdd: (place: SavedPlace) => void;
  onDelete: (id: string) => void;
}
export const SavedPlacesModal: React.FC<Props> = ({visible,places,activePlaceId,onClose,onSelect,onAdd,onDelete}) => {
  const [adding,setAdding]=useState(false);
  const [label,setLabel]=useState('Casa');
  const [location,setLocation]=useState<any>(null);
  const [addressLine,setAddressLine]=useState('');
  const [gpsMessage,setGpsMessage]=useState('');
  const captureGps=async()=>{
    setGpsMessage('');
    try{
      const permission=await Location.requestForegroundPermissionsAsync();
      if(!permission.granted) throw new Error('Permite el acceso a ubicación para guardar este punto.');
      const position=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
      setLocation((current:any)=>current?{...current,coords:{latitude:position.coords.latitude,longitude:position.coords.longitude}}:current);
      setGpsMessage('Punto GPS guardado para calcular distancias.');
    }catch(error){setGpsMessage(error instanceof Error?error.message:'No se pudo obtener el GPS.');}
  };
  const add=(selected?: any)=>{
    if(selected){setLocation(selected);setGpsMessage('');return;}
    if(!location || !label.trim()) return;
    onAdd({...location,id:`place-${Date.now()}`,label:label.trim(),addressLine:addressLine.trim()}); setLocation(null);setLabel('Casa');setAddressLine('');setAdding(false);
  };
  return <>
    <Modal visible={visible && !adding} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}><View style={styles.sheet}>
        <View style={styles.header}><Text style={styles.title}>Mis direcciones</Text><TouchableOpacity accessibilityLabel="Cerrar" onPress={onClose}><MaterialIcons name="close" size={22} color={Colors.slateDim}/></TouchableOpacity></View>
        <Text style={styles.subtitle}>Guarda lugares como Casa, Trabajo o Universidad y elige cuál usar.</Text>
        <ScrollView style={{maxHeight:320}}>{places.map(place=><View key={place.id} style={styles.row}>
          <TouchableOpacity style={{flex:1}} onPress={()=>onSelect(place)}><Text style={styles.placeTitle}>{place.label} {place.id===activePlaceId?'· Actual':''}</Text><Text style={styles.placeSubtitle}>{place.addressLine ? `${place.addressLine} · ` : ''}{place.neighborhood} · {place.district}</Text></TouchableOpacity>
          <TouchableOpacity accessibilityLabel={`Eliminar ${place.label}`} onPress={()=>onDelete(place.id)}><MaterialIcons name="delete-outline" size={20} color={Colors.emergencyDark}/></TouchableOpacity>
        </View>)}</ScrollView>
        <TextInput value={label} onChangeText={setLabel} placeholder="Nombre: Casa, Trabajo..." maxLength={40} style={styles.input}/>
        {!!location && <><Text style={styles.subtitle}>Nueva dirección: {location.neighborhood} · {location.district}</Text><TextInput value={addressLine} onChangeText={setAddressLine} placeholder="Dirección exacta: avenida, número, referencia" maxLength={160} style={styles.input}/><TouchableOpacity style={styles.gpsButton} onPress={()=>{void captureGps();}}><MaterialIcons name="my-location" size={17} color={Colors.primary}/><Text style={styles.gpsText}>{location.coords?'Actualizar punto GPS':'Guardar punto GPS para distancias'}</Text></TouchableOpacity>{!!gpsMessage&&<Text style={styles.subtitle}>{gpsMessage}</Text>}</>}
        <TouchableOpacity style={styles.button} onPress={()=>location ? add() : setAdding(true)}><Text style={styles.buttonText}>{location?'Guardar dirección':'Agregar dirección'}</Text></TouchableOpacity>
      </View></View>
    </Modal>
    <NeighborhoodModal visible={visible && adding} onClose={()=>setAdding(false)} onSelect={add}/>
  </>;
};
const styles=StyleSheet.create({overlay:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(15,23,42,0.5)'},sheet:{backgroundColor:'#fff',padding:22,borderTopLeftRadius:22,borderTopRightRadius:22,gap:12},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},title:{fontSize:20,fontWeight:'800',color:Colors.secondary},subtitle:{fontSize:13,color:Colors.secondaryMuted},row:{flexDirection:'row',alignItems:'center',paddingVertical:12,borderBottomWidth:1,borderColor:Colors.border},placeTitle:{fontSize:15,fontWeight:'700',color:Colors.secondary},placeSubtitle:{fontSize:12,color:Colors.secondaryMuted,marginTop:3},input:{borderWidth:1,borderColor:Colors.border,borderRadius:10,padding:12,color:Colors.secondary},button:{backgroundColor:Colors.primary,padding:14,borderRadius:10,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'700'},gpsButton:{flexDirection:'row',alignItems:'center',gap:8,padding:10,backgroundColor:'#eff6ff',borderRadius:9},gpsText:{fontSize:12,fontWeight:'700',color:Colors.primary}});
