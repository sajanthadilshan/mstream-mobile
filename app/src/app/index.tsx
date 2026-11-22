import SecureWebView from '../components/SecureWebView';
import { useKeepAwake } from 'expo-keep-awake';


export default function Home() {
  useKeepAwake();
  return <SecureWebView />;
}