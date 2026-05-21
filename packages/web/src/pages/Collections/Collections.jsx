import { useParams } from 'react-router-dom';
import CollectionsList from './CollectionsList';
import CollectionDetail from './CollectionDetail';

export default function Collections() {
  const { collectionId } = useParams();
  return collectionId ? <CollectionDetail collectionId={collectionId} /> : <CollectionsList />;
}
