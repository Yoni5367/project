import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HousemateIntake() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/seeker-form', { replace: true }); }, []);
  return null;
}
