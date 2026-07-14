import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { housemateAPI } from '../services/api';

export default function FindGroup() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role === 'provider') { navigate('/housemate-group-applicants'); return; }
    housemateAPI.getIntake()
      .then(res => { navigate(res.intake ? '/housemate-suggestions' : '/seeker-form'); })
      .catch(() => navigate('/seeker-form'));
  }, [user]);

  return null;
}
