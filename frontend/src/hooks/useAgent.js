import { useMutation } from '@tanstack/react-query';
import { postAgentQuery } from '../api/agent';

export const useAgentQuery = () => {
  return useMutation({
    mutationFn: (queryText) => postAgentQuery(queryText),
  });
};
